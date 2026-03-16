import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service.js';

@Injectable()
export class ExportService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrders(tenantId: string, since?: string) {
    const where: Record<string, unknown> = {
      tenantId,
      deletedAt: null,
    };

    if (since) {
      where.createdAt = { gte: new Date(since) };
    }

    const orders = await this.prisma.order.findMany({
      where,
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, slug: true } },
            variant: { select: { id: true, name: true } },
          },
        },
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return orders;
  }

  async getCustomers(tenantId: string, since?: string) {
    const where: Record<string, unknown> = {
      tenantId,
      deletedAt: null,
    };

    if (since) {
      where.createdAt = { gte: new Date(since) };
    }

    const customers = await this.prisma.customer.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        momoNumber: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return customers;
  }
}
