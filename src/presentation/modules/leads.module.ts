import { Module } from '@nestjs/common';
import { LeadTrackingController } from '../controllers/lead-tracking.controller.js';
import { LeadService } from '../../application/leads/services/lead.service.js';
import { LeadScoringService } from '../../application/leads/services/lead-scoring.service.js';
import { LeadConversionService } from '../../application/leads/services/lead-conversion.service.js';
import { LeadStatsService } from '../../application/leads/services/lead-stats.service.js';

@Module({
  controllers: [LeadTrackingController],
  providers: [LeadService, LeadScoringService, LeadConversionService, LeadStatsService],
  exports: [LeadService, LeadScoringService, LeadConversionService, LeadStatsService],
})
export class LeadsModule {}
