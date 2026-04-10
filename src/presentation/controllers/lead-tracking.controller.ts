import { Body, Controller, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { LeadService } from '../../application/leads/services/lead.service.js';
import { TrackLeadDto } from '../../application/leads/dtos/track-lead.dto.js';
import { TenantId } from '../../infrastructure/tenant/tenant-id.decorator.js';
import type { Request } from 'express';

@ApiTags('Lead Tracking')
@Controller('leads')
export class LeadTrackingController {
  constructor(private readonly leadService: LeadService) {}

  @Post('track')
  @ApiOperation({ summary: 'Track a lead event (public)' })
  async track(
    @Body() dto: TrackLeadDto,
    @TenantId() tenantId: string,
    @Req() req: Request,
  ) {
    // Try to extract email from JWT if authenticated, otherwise use body
    const authUser = (req as any).user;
    const email = authUser?.email ?? dto.email;

    if (!email) {
      // Cannot track without an email — silently skip
      return { tracked: false, reason: 'no_email' };
    }

    await this.leadService.recordActivity(email, tenantId, dto.action, {
      productId: dto.productId,
      metadata: dto.metadata ? JSON.parse(dto.metadata) : undefined,
    });

    return { tracked: true };
  }
}
