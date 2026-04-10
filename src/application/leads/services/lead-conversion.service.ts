import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service.js';

@Injectable()
export class LeadConversionService {
  private readonly logger = new Logger(LeadConversionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async markConverted(
    email: string,
    tenantId: string,
    orderId: string,
  ): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();

    const lead = await this.prisma.lead.findUnique({
      where: { email_tenantId: { email: normalizedEmail, tenantId } },
    });

    if (!lead) {
      this.logger.debug(`No lead record found for ${normalizedEmail}, skipping conversion`);
      return;
    }

    if (lead.status === 'CONVERTED') {
      this.logger.debug(`Lead ${normalizedEmail} already converted, skipping`);
      return;
    }

    await this.prisma.$transaction([
      this.prisma.lead.update({
        where: { id: lead.id },
        data: {
          status: 'CONVERTED',
          convertedAt: new Date(),
          convertedOrderId: orderId,
        },
      }),
      this.prisma.leadActivity.create({
        data: {
          leadId: lead.id,
          tenantId,
          action: 'purchase',
          scoreDelta: 0,
          metadata: JSON.stringify({ orderId }),
        },
      }),
    ]);

    this.logger.log(`Lead converted: ${normalizedEmail} → order ${orderId}`);
  }
}
