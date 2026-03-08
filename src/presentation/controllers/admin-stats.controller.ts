import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard.js';
import { RolesGuard } from '../../infrastructure/auth/roles.guard.js';
import { Roles } from '../../infrastructure/auth/roles.decorator.js';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../../infrastructure/auth/jwt.strategy.js';

@ApiTags('Admin - Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/stats')
export class AdminStatsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Get dashboard stats' })
  async getStats(@CurrentUser() user: AuthenticatedUser) {
    const tenantId = user.tenantId;

    const [
      totalOrders,
      pendingOrders,
      confirmedOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      totalProducts,
      lowStockProducts,
      totalCustomers,
      revenueResult,
      recentOrders,
      recentCustomers,
      topProducts,
    ] = await Promise.all([
      this.prisma.order.count({
        where: { tenantId, deletedAt: null },
      }),
      this.prisma.order.count({
        where: { tenantId, status: 'PENDING_PAYMENT', deletedAt: null },
      }),
      this.prisma.order.count({
        where: { tenantId, status: 'PAYMENT_CONFIRMED', deletedAt: null },
      }),
      this.prisma.order.count({
        where: { tenantId, status: 'PROCESSING', deletedAt: null },
      }),
      this.prisma.order.count({
        where: { tenantId, status: 'SHIPPED', deletedAt: null },
      }),
      this.prisma.order.count({
        where: { tenantId, status: 'DELIVERED', deletedAt: null },
      }),
      this.prisma.order.count({
        where: { tenantId, status: 'CANCELLED', deletedAt: null },
      }),
      this.prisma.product.count({
        where: { tenantId, deletedAt: null },
      }),
      this.prisma.product.count({
        where: { tenantId, deletedAt: null, stockCount: { lte: 5 } },
      }),
      this.prisma.customer.count({
        where: { tenantId, deletedAt: null },
      }),
      this.prisma.order.aggregate({
        where: {
          tenantId,
          deletedAt: null,
          status: { notIn: ['CANCELLED', 'REFUNDED'] },
        },
        _sum: { totalPesewas: true },
      }),
      this.prisma.order.findMany({
        where: { tenantId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          customer: { select: { firstName: true, lastName: true, email: true } },
        },
      }),
      this.prisma.customer.findMany({
        where: { tenantId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          createdAt: true,
          _count: { select: { orders: true } },
        },
      }),
      this.prisma.orderItem.groupBy({
        by: ['productId'],
        _sum: { quantity: true },
        _count: true,
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),
    ]);

    // Fetch product details for top products
    const topProductIds = topProducts.map((p) => p.productId);
    const productDetails = topProductIds.length > 0
      ? await this.prisma.product.findMany({
          where: { id: { in: topProductIds } },
          select: { id: true, name: true, pricePesewas: true, stockCount: true, imagesJson: true },
        })
      : [];

    const productMap = new Map(productDetails.map((p) => [p.id, p]));

    return {
      totalOrders,
      pendingOrders,
      totalProducts,
      totalCustomers,
      totalRevenuePesewas: revenueResult._sum.totalPesewas ?? 0,
      lowStockProducts,
      ordersByStatus: {
        pending: pendingOrders,
        confirmed: confirmedOrders,
        processing: processingOrders,
        shipped: shippedOrders,
        delivered: deliveredOrders,
        cancelled: cancelledOrders,
      },
      recentOrders: recentOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        totalPesewas: o.totalPesewas,
        customerName: `${o.customer.firstName} ${o.customer.lastName}`,
        customerEmail: o.customer.email,
        createdAt: o.createdAt,
      })),
      recentCustomers: recentCustomers.map((c) => ({
        id: c.id,
        name: `${c.firstName} ${c.lastName}`,
        email: c.email,
        ordersCount: c._count.orders,
        joinedAt: c.createdAt,
      })),
      topProducts: topProducts.map((tp) => {
        const product = productMap.get(tp.productId);
        return {
          productId: tp.productId,
          name: product?.name ?? 'Unknown',
          pricePesewas: product?.pricePesewas ?? 0,
          stockCount: product?.stockCount ?? 0,
          totalSold: tp._sum.quantity ?? 0,
        };
      }),
    };
  }
}
