import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service.js';
import { LeadScoringService } from './lead-scoring.service.js';
import type { LeadSource, LeadStatus, Prisma } from '@prisma/client';

const SCORE_THRESHOLDS = {
  ENGAGED: 10,
  QUALIFIED: 30,
} as const;

@Injectable()
export class LeadService {
  private readonly logger = new Logger(LeadService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scoringService: LeadScoringService,
  ) {}

  async findOrCreateLead(
    email: string,
    tenantId: string,
    source: LeadSource,
  ) {
    const normalizedEmail = email.toLowerCase().trim();

    return this.prisma.lead.upsert({
      where: { email_tenantId: { email: normalizedEmail, tenantId } },
      update: { lastActivityAt: new Date() },
      create: {
        email: normalizedEmail,
        tenantId,
        source,
        status: 'NEW',
        score: 0,
      },
    });
  }

  async recordActivity(
    email: string,
    tenantId: string,
    action: string,
    options?: {
      source?: LeadSource;
      productId?: string;
      metadata?: Record<string, unknown>;
      customerId?: string;
    },
  ): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();
    const source = options?.source ?? this.inferSource(action);

    const lead = await this.prisma.lead.upsert({
      where: { email_tenantId: { email: normalizedEmail, tenantId } },
      update: {
        lastActivityAt: new Date(),
        ...(options?.customerId ? { customerId: options.customerId } : {}),
      },
      create: {
        email: normalizedEmail,
        tenantId,
        source,
        status: 'NEW',
        score: 0,
        ...(options?.customerId ? { customerId: options.customerId } : {}),
      },
    });

    // Skip if already converted (don't inflate score)
    if (lead.status === 'CONVERTED') return;

    const scoreDelta = await this.scoringService.getScoreForAction(action, tenantId);

    await this.prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        tenantId,
        action,
        productId: options?.productId,
        metadata: options?.metadata ? JSON.stringify(options.metadata) : null,
        scoreDelta,
      },
    });

    const newScore = lead.score + scoreDelta;
    const newStatus = this.computeStatus(newScore, lead.status as LeadStatus);

    if (newScore !== lead.score || newStatus !== lead.status) {
      await this.prisma.lead.update({
        where: { id: lead.id },
        data: { score: newScore, status: newStatus },
      });
    }

    this.logger.debug(
      `Lead activity: ${normalizedEmail} -> ${action} (+${scoreDelta}pts, total: ${newScore}, status: ${newStatus})`,
    );
  }

  async linkCustomerToLead(
    email: string,
    tenantId: string,
    customerId: string,
  ): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();

    await this.prisma.lead.updateMany({
      where: { email: normalizedEmail, tenantId, customerId: null },
      data: { customerId },
    });
  }

  async getLeads(
    tenantId: string,
    query: {
      page?: number;
      limit?: number;
      status?: string;
      source?: string;
      minScore?: number;
      search?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    },
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.LeadWhereInput = { tenantId };

    if (query.status) {
      where.status = query.status as LeadStatus;
    }
    if (query.source) {
      where.source = query.source as LeadSource;
    }
    if (query.minScore !== undefined) {
      where.score = { gte: query.minScore };
    }
    if (query.search) {
      where.email = { contains: query.search, mode: 'insensitive' };
    }

    const orderBy: Prisma.LeadOrderByWithRelationInput = {};
    const sortField = query.sortBy ?? 'lastActivityAt';
    const sortDir = query.sortOrder ?? 'desc';

    if (['score', 'email', 'lastActivityAt', 'createdAt', 'firstTouchAt'].includes(sortField)) {
      (orderBy as Record<string, string>)[sortField] = sortDir;
    }

    const [data, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.lead.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getLeadById(id: string, tenantId: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, tenantId },
      include: {
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    return lead;
  }

  private computeStatus(score: number, currentStatus: LeadStatus): LeadStatus {
    if (currentStatus === 'CONVERTED') return 'CONVERTED';
    if (score >= SCORE_THRESHOLDS.QUALIFIED) return 'QUALIFIED';
    if (score >= SCORE_THRESHOLDS.ENGAGED) return 'ENGAGED';
    return 'NEW';
  }

  private inferSource(action: string): LeadSource {
    const sourceMap: Record<string, LeadSource> = {
      newsletter_signup: 'NEWSLETTER',
      account_created: 'REGISTRATION',
      whatsapp_click: 'WHATSAPP_INQUIRY',
      stock_notify_subscribe: 'STOCK_NOTIFICATION',
      add_to_cart: 'CART_ACTIVITY',
      wishlist_add: 'WISHLIST',
    };
    return sourceMap[action] ?? 'DIRECT_VISIT';
  }
}
