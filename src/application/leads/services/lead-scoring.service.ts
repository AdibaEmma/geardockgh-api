import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service.js';
import type { ScoringRuleItemDto } from '../dtos/update-scoring-rules.dto.js';

const DEFAULT_RULES: Record<string, number> = {
  page_view: 1,
  newsletter_signup: 10,
  account_created: 15,
  add_to_cart: 5,
  wishlist_add: 3,
  checkout_start: 10,
  whatsapp_click: 8,
  stock_notify_subscribe: 5,
  purchase: 0,
};

@Injectable()
export class LeadScoringService {
  private readonly logger = new Logger(LeadScoringService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getScoreForAction(action: string, tenantId: string): Promise<number> {
    await this.ensureDefaultRules(tenantId);

    const rule = await this.prisma.leadScoringRule.findUnique({
      where: { tenantId_action: { tenantId, action } },
    });

    if (!rule || !rule.isActive) return 0;
    return rule.points;
  }

  async getRules(tenantId: string) {
    await this.ensureDefaultRules(tenantId);
    return this.prisma.leadScoringRule.findMany({
      where: { tenantId },
      orderBy: { action: 'asc' },
    });
  }

  async updateRules(tenantId: string, rules: ScoringRuleItemDto[]) {
    const operations = rules.map((rule) =>
      this.prisma.leadScoringRule.upsert({
        where: { tenantId_action: { tenantId, action: rule.action } },
        update: { points: rule.points, isActive: rule.isActive ?? true },
        create: {
          tenantId,
          action: rule.action,
          points: rule.points,
          isActive: rule.isActive ?? true,
        },
      }),
    );

    return this.prisma.$transaction(operations);
  }

  async ensureDefaultRules(tenantId: string): Promise<void> {
    const count = await this.prisma.leadScoringRule.count({ where: { tenantId } });
    if (count > 0) return;

    this.logger.log(`Seeding default scoring rules for tenant ${tenantId}`);

    const creates = Object.entries(DEFAULT_RULES).map(([action, points]) =>
      this.prisma.leadScoringRule.create({
        data: { tenantId, action, points },
      }),
    );

    await this.prisma.$transaction(creates);
  }
}
