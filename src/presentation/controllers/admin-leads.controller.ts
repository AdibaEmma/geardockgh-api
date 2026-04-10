import { Body, Controller, Get, Param, Put, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard.js';
import { RolesGuard } from '../../infrastructure/auth/roles.guard.js';
import { Roles } from '../../infrastructure/auth/roles.decorator.js';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator.js';
import { LeadService } from '../../application/leads/services/lead.service.js';
import { LeadScoringService } from '../../application/leads/services/lead-scoring.service.js';
import { LeadStatsService } from '../../application/leads/services/lead-stats.service.js';
import { LeadConversionService } from '../../application/leads/services/lead-conversion.service.js';
import { LeadQueryDto } from '../../application/leads/dtos/lead-query.dto.js';
import { UpdateScoringRulesDto } from '../../application/leads/dtos/update-scoring-rules.dto.js';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';
import type { AuthenticatedUser } from '../../infrastructure/auth/jwt.strategy.js';

@ApiTags('Admin - Leads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/leads')
export class AdminLeadsController {
  constructor(
    private readonly leadService: LeadService,
    private readonly scoringService: LeadScoringService,
    private readonly statsService: LeadStatsService,
    private readonly conversionService: LeadConversionService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List leads (paginated)' })
  async findAll(
    @Query() query: LeadQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.leadService.getLeads(user.tenantId, {
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
      status: query.status,
      source: query.source,
      minScore: query.minScore ? Number(query.minScore) : undefined,
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get lead pipeline stats' })
  async getStats(@CurrentUser() user: AuthenticatedUser) {
    return this.statsService.getStats(user.tenantId);
  }

  @Get('scoring-rules')
  @ApiOperation({ summary: 'Get scoring rules' })
  async getScoringRules(@CurrentUser() user: AuthenticatedUser) {
    return this.scoringService.getRules(user.tenantId);
  }

  @Put('scoring-rules')
  @ApiOperation({ summary: 'Update scoring rules' })
  async updateScoringRules(
    @Body() dto: UpdateScoringRulesDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.scoringService.updateRules(user.tenantId, dto.rules);
  }

  @Post('backfill')
  @ApiOperation({ summary: 'Backfill leads from existing data' })
  async backfill(@CurrentUser() user: AuthenticatedUser) {
    const tenantId = user.tenantId;
    let created = 0;
    let updated = 0;

    // 1. Newsletter subscribers
    const subscribers = await this.prisma.newsletterSubscriber.findMany({
      where: { tenantId, isActive: true },
    });

    for (const sub of subscribers) {
      const existing = await this.prisma.lead.findUnique({
        where: { email_tenantId: { email: sub.email, tenantId } },
      });

      if (!existing) {
        await this.prisma.lead.create({
          data: {
            email: sub.email,
            tenantId,
            source: 'NEWSLETTER',
            status: 'ENGAGED',
            score: 10,
            firstTouchAt: sub.subscribedAt,
            lastActivityAt: sub.subscribedAt,
          },
        });
        created++;
      }
    }

    // 2. Registered customers
    const customers = await this.prisma.customer.findMany({
      where: { tenantId, deletedAt: null, role: 'CUSTOMER' },
      include: {
        orders: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'asc' },
          take: 1,
        },
      },
    });

    for (const customer of customers) {
      const existing = await this.prisma.lead.findUnique({
        where: { email_tenantId: { email: customer.email, tenantId } },
      });

      const firstOrder = customer.orders[0];
      const isConverted = !!firstOrder;

      if (existing) {
        // Link customer and update status if converted
        const updates: Record<string, unknown> = { customerId: customer.id };
        if (isConverted && existing.status !== 'CONVERTED') {
          updates.status = 'CONVERTED';
          updates.convertedAt = firstOrder.createdAt;
          updates.convertedOrderId = firstOrder.id;
          updates.score = Math.max(existing.score, 25);
        }
        await this.prisma.lead.update({
          where: { id: existing.id },
          data: updates,
        });
        updated++;
      } else {
        await this.prisma.lead.create({
          data: {
            email: customer.email,
            tenantId,
            customerId: customer.id,
            source: 'REGISTRATION',
            status: isConverted ? 'CONVERTED' : 'ENGAGED',
            score: isConverted ? 25 : 15,
            firstTouchAt: customer.createdAt,
            lastActivityAt: isConverted ? firstOrder.createdAt : customer.createdAt,
            convertedAt: isConverted ? firstOrder.createdAt : null,
            convertedOrderId: isConverted ? firstOrder.id : null,
          },
        });
        created++;
      }
    }

    // 3. Stock notification subscribers
    const stockNotifs = await this.prisma.stockNotification.findMany({
      where: { tenantId },
      include: { customer: { select: { email: true } } },
    });

    for (const notif of stockNotifs) {
      const existing = await this.prisma.lead.findUnique({
        where: { email_tenantId: { email: notif.customer.email, tenantId } },
      });

      if (existing) {
        // Add activity if it doesn't conflict
        await this.prisma.leadActivity.create({
          data: {
            leadId: existing.id,
            tenantId,
            action: 'stock_notify_subscribe',
            productId: notif.productId,
            scoreDelta: 0,
            createdAt: notif.createdAt,
          },
        });
      }
    }

    return { created, updated, total: created + updated };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get lead detail with activities' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.leadService.getLeadById(id, user.tenantId);
  }
}
