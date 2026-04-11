import {
  Injectable,
  BadRequestException,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service.js';
import { ImportBrainSyncService } from '../../integrations/services/importbrain-sync.service.js';
import { LeadConversionService } from '../../leads/services/lead-conversion.service.js';
import { DiscountService } from '../../discounts/services/discount.service.js';
import { randomBytes } from 'crypto';
import type { CreateOrderDto } from '../dtos/create-order.dto.js';
import type { CreateAdminOrderDto } from '../dtos/create-admin-order.dto.js';
import type { UpdateOrderDto } from '../dtos/update-order.dto.js';
import type { OrderQueryDto } from '../dtos/order-query.dto.js';
import type { PaginatedResult } from '../../../core/interfaces/pagination.interface.js';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly importBrainSync: ImportBrainSyncService,
    @Optional() private readonly leadConversionService?: LeadConversionService,
    @Optional() private readonly discountService?: DiscountService,
  ) {}

  async create(dto: CreateOrderDto, customerId: string, tenantId: string) {
    const productIds = dto.items.map((i) => i.productId);

    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, tenantId, deletedAt: null },
      include: { variants: true },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException('One or more products not found');
    }

    let subtotalPesewas = 0;
    const orderItemsData: {
      productId: string;
      variantId: string | null;
      quantity: number;
      unitPricePesewas: number;
      selectedOptionsJson: string | null;
    }[] = [];

    for (const item of dto.items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) {
        throw new BadRequestException(`Product ${item.productId} not found`);
      }

      let unitPrice = product.pricePesewas;
      let availableStock = product.stockCount;

      if (item.variantId) {
        const variant = product.variants.find((v) => v.id === item.variantId);
        if (!variant) {
          throw new BadRequestException(`Variant ${item.variantId} not found`);
        }
        unitPrice = variant.pricePesewas;
        availableStock = variant.stockCount;
      }

      if (!product.isPreorder && availableStock < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for "${product.name}". Available: ${availableStock}`,
        );
      }

      subtotalPesewas += unitPrice * item.quantity;
      orderItemsData.push({
        productId: item.productId,
        variantId: item.variantId ?? null,
        quantity: item.quantity,
        unitPricePesewas: unitPrice,
        selectedOptionsJson: item.selectedOptions ?? null,
      });
    }

    const orderNumber = this.generateOrderNumber();

    // Apply discount code if provided
    let discountPesewas = 0;
    let appliedDiscountCode: string | null = null;
    if (dto.discountCode && this.discountService) {
      const result = await this.discountService.validate(dto.discountCode, subtotalPesewas, tenantId);
      if (result.valid) {
        discountPesewas = result.discountPesewas;
        appliedDiscountCode = dto.discountCode.toUpperCase().trim();
      }
    }

    const totalPesewas = subtotalPesewas - discountPesewas;

    const order = await this.prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          tenantId,
          orderNumber,
          customerId,
          subtotalPesewas,
          totalPesewas,
          discountPesewas,
          discountCode: appliedDiscountCode,
          shippingAddressId: dto.shippingAddressId,
          notes: dto.notes,
          items: {
            create: orderItemsData,
          },
        },
        include: {
          items: { include: { product: true, variant: true } },
          payments: true,
          customer: true,
        },
      });

      for (const item of orderItemsData) {
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stockCount: { decrement: item.quantity } },
          });
        } else {
          await tx.product.update({
            where: { id: item.productId },
            data: { stockCount: { decrement: item.quantity } },
          });
        }
      }

      return newOrder;
    });

    // Redeem discount code (fire-and-forget)
    if (appliedDiscountCode) {
      this.discountService?.redeem(appliedDiscountCode, tenantId).catch(() => {});
    }

    // Push order to ImportBrain (fire-and-forget)
    this.importBrainSync.pushOrder(tenantId, order).catch((err) => {
      this.logger.warn(`Failed to push order to ImportBrain: ${err.message}`);
    });

    // Track lead conversion (fire-and-forget)
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { email: true },
    });
    if (customer) {
      this.leadConversionService
        ?.markConverted(customer.email, tenantId, order.id)
        .catch(() => {});
    }

    return order;
  }

  async findAll(
    query: OrderQueryDto,
    customerId: string,
    tenantId: string,
  ): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {
      tenantId,
      customerId,
      deletedAt: null,
    };

    if (query.status) {
      where.status = query.status;
    }

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          items: { include: { product: true, variant: true } },
          payments: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findAllAdmin(
    query: OrderQueryDto,
    tenantId: string,
  ): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {
      tenantId,
      deletedAt: null,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.OR = [
        { orderNumber: { contains: query.search, mode: 'insensitive' } },
        {
          customer: {
            firstName: { contains: query.search, mode: 'insensitive' },
          },
        },
        {
          customer: {
            lastName: { contains: query.search, mode: 'insensitive' },
          },
        },
      ];
    }

    const allowedSortFields = ['orderNumber', 'status', 'totalPesewas', 'createdAt'];
    const orderBy: any =
      query.sortBy && allowedSortFields.includes(query.sortBy)
        ? { [query.sortBy]: query.sortOrder ?? 'asc' }
        : { createdAt: 'desc' };

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          items: { include: { product: true, variant: true } },
          payments: true,
          customer: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findByIdAdmin(id: string, tenantId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        items: { include: { product: true, variant: true } },
        payments: true,
        shipment: true,
        shippingAddress: true,
        customer: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async findById(id: string, customerId: string, tenantId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, customerId, tenantId, deletedAt: null },
      include: {
        items: { include: { product: true, variant: true } },
        payments: true,
        shipment: true,
        shippingAddress: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async bulkUpdateStatus(
    dto: { orderIds: string[]; status: OrderStatus },
    tenantId: string,
  ) {
    const result = await this.prisma.order.updateMany({
      where: {
        id: { in: dto.orderIds },
        tenantId,
        deletedAt: null,
      },
      data: { status: dto.status },
    });

    return { updatedCount: result.count };
  }

  async update(id: string, dto: UpdateOrderDto, tenantId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const updated = await this.prisma.order.update({
      where: { id },
      data: {
        status: dto.status,
        notes: dto.notes,
      },
      include: {
        items: { include: { product: true, variant: true } },
        payments: true,
        customer: true,
      },
    });

    // Sync status update to ImportBrain (fire-and-forget)
    if (dto.status && dto.status !== order.status) {
      this.importBrainSync.pushOrder(tenantId, updated).catch((err) => {
        this.logger.warn(`Failed to sync order status to ImportBrain: ${err.message}`);
      });
    }

    return updated;
  }

  async cancel(id: string, customerId: string, tenantId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, customerId, tenantId, deletedAt: null },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException(
        'Only orders with pending payment can be cancelled',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stockCount: { increment: item.quantity } },
          });
        } else {
          await tx.product.update({
            where: { id: item.productId },
            data: { stockCount: { increment: item.quantity } },
          });
        }
      }

      return tx.order.update({
        where: { id },
        data: { status: OrderStatus.CANCELLED },
        include: {
          items: { include: { product: true, variant: true } },
          payments: true,
        },
      });
    });
  }

  async createManualOrder(dto: CreateAdminOrderDto, tenantId: string) {
    // Resolve or create customer
    let customerId = dto.customerId;

    if (!customerId) {
      // Check if customer with this email or phone already exists
      if (dto.customerEmail) {
        const existing = await this.prisma.customer.findUnique({
          where: { email_tenantId: { email: dto.customerEmail, tenantId } },
        });
        if (existing) {
          customerId = existing.id;
        }
      }

      if (!customerId) {
        // Create a walk-in customer with a placeholder password
        const email = dto.customerEmail || `walkin-${Date.now()}@geardockgh.local`;
        const customer = await this.prisma.customer.create({
          data: {
            tenantId,
            firstName: dto.customerName.split(' ')[0] || dto.customerName,
            lastName: dto.customerName.split(' ').slice(1).join(' ') || '',
            email,
            passwordHash: randomBytes(32).toString('hex'),
            phone: dto.customerPhone,
          },
        });
        customerId = customer.id;
      }
    }

    // Validate products and build order items (same as create)
    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, tenantId, deletedAt: null },
      include: { variants: true },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException('One or more products not found');
    }

    let subtotalPesewas = 0;
    const orderItemsData: {
      productId: string;
      variantId: string | null;
      quantity: number;
      unitPricePesewas: number;
      selectedOptionsJson: string | null;
    }[] = [];

    for (const item of dto.items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) {
        throw new BadRequestException(`Product ${item.productId} not found`);
      }

      let unitPrice = product.pricePesewas;
      let availableStock = product.stockCount;

      if (item.variantId) {
        const variant = product.variants.find((v) => v.id === item.variantId);
        if (!variant) {
          throw new BadRequestException(`Variant ${item.variantId} not found`);
        }
        unitPrice = variant.pricePesewas;
        availableStock = variant.stockCount;
      }

      if (availableStock < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for "${product.name}". Available: ${availableStock}`,
        );
      }

      subtotalPesewas += unitPrice * item.quantity;
      orderItemsData.push({
        productId: item.productId,
        variantId: item.variantId ?? null,
        quantity: item.quantity,
        unitPricePesewas: unitPrice,
        selectedOptionsJson: item.selectedOptions ?? null,
      });
    }

    const deliveryFee = dto.deliveryFee ?? 0;
    const discount = dto.discountPesewas ?? 0;
    const totalPesewas = subtotalPesewas + deliveryFee - discount;
    const orderNumber = this.generateOrderNumber();

    // Map payment method to PaymentProvider enum
    const providerMap: Record<string, 'PAYSTACK' | 'MOMO' | 'BANK_TRANSFER'> = {
      CASH: 'BANK_TRANSFER',
      MOMO: 'MOMO',
      BANK_TRANSFER: 'BANK_TRANSFER',
    };

    const order = await this.prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          tenantId,
          orderNumber,
          customerId,
          source: 'manual',
          status: (dto.status as any) ?? 'PAYMENT_CONFIRMED',
          subtotalPesewas,
          totalPesewas,
          deliveryFee,
          discountPesewas: discount,
          notes: dto.notes ? `[Manual Sale — ${dto.paymentMethod}] ${dto.notes}` : `[Manual Sale — ${dto.paymentMethod}]`,
          items: { create: orderItemsData },
          payments: {
            create: {
              provider: providerMap[dto.paymentMethod],
              amountPesewas: totalPesewas,
              status: dto.status === 'PENDING_PAYMENT' ? 'PENDING' : 'SUCCESS',
              paidAt: dto.status === 'PENDING_PAYMENT' ? null : new Date(),
            },
          },
        },
        include: {
          items: { include: { product: true, variant: true } },
          payments: true,
          customer: true,
        },
      });

      // Decrement stock
      for (const item of orderItemsData) {
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stockCount: { decrement: item.quantity } },
          });
        } else {
          await tx.product.update({
            where: { id: item.productId },
            data: { stockCount: { decrement: item.quantity } },
          });
        }
      }

      return newOrder;
    });

    // Push to ImportBrain (fire-and-forget)
    this.importBrainSync.pushOrder(tenantId, order).catch((err) => {
      this.logger.warn(`Failed to push manual order to ImportBrain: ${err.message}`);
    });

    this.logger.log(`Manual order created: ${orderNumber} (${dto.paymentMethod})`);

    return order;
  }

  private generateOrderNumber(): string {
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(1000 + Math.random() * 9000);
    return `GD-${date}-${random}`;
  }
}
