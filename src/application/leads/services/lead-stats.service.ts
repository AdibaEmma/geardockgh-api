import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service.js';

export interface LeadPipeline {
  NEW: number;
  ENGAGED: number;
  QUALIFIED: number;
  CONVERTED: number;
  INACTIVE: number;
}

export interface LeadStats {
  pipeline: LeadPipeline;
  totalLeads: number;
  conversionRate: number;
  sourceBreakdown: Record<string, number>;
  avgTimeToConversion: number | null;
  recentLeads: Array<{
    id: string;
    email: string;
    source: string;
    status: string;
    score: number;
    createdAt: Date;
  }>;
}

@Injectable()
export class LeadStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(tenantId: string): Promise<LeadStats> {
    const [statusCounts, sourceCounts, totalLeads, convertedLeads, recentLeads, avgConversion] =
      await Promise.all([
        this.prisma.lead.groupBy({
          by: ['status'],
          where: { tenantId },
          _count: true,
        }),
        this.prisma.lead.groupBy({
          by: ['source'],
          where: { tenantId },
          _count: true,
        }),
        this.prisma.lead.count({ where: { tenantId } }),
        this.prisma.lead.count({ where: { tenantId, status: 'CONVERTED' } }),
        this.prisma.lead.findMany({
          where: { tenantId },
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            email: true,
            source: true,
            status: true,
            score: true,
            createdAt: true,
          },
        }),
        this.getAvgTimeToConversion(tenantId),
      ]);

    const pipeline: LeadPipeline = {
      NEW: 0,
      ENGAGED: 0,
      QUALIFIED: 0,
      CONVERTED: 0,
      INACTIVE: 0,
    };

    for (const row of statusCounts) {
      pipeline[row.status as keyof LeadPipeline] = row._count;
    }

    const sourceBreakdown: Record<string, number> = {};
    for (const row of sourceCounts) {
      sourceBreakdown[row.source] = row._count;
    }

    return {
      pipeline,
      totalLeads,
      conversionRate: totalLeads > 0 ? Number(((convertedLeads / totalLeads) * 100).toFixed(1)) : 0,
      sourceBreakdown,
      avgTimeToConversion: avgConversion,
      recentLeads,
    };
  }

  private async getAvgTimeToConversion(tenantId: string): Promise<number | null> {
    const result = await this.prisma.$queryRaw<Array<{ avg_days: number | null }>>`
      SELECT AVG(EXTRACT(EPOCH FROM (converted_at - first_touch_at)) / 86400)::numeric(10,1) as avg_days
      FROM leads
      WHERE tenant_id = ${tenantId}
        AND status = 'CONVERTED'
        AND converted_at IS NOT NULL
    `;

    return result[0]?.avg_days ?? null;
  }
}
