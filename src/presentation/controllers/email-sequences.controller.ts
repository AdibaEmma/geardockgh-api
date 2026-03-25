import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { EmailSequenceService } from '../../application/email-sequences/services/email-sequence.service.js';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard.js';
import { TenantId } from '../../infrastructure/tenant/tenant-id.decorator.js';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';

@ApiTags('Email Sequences')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('email-sequences')
export class EmailSequencesController {
  constructor(
    private readonly emailSequenceService: EmailSequenceService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all email sequences (admin)' })
  async list(@TenantId() tenantId: string) {
    const sequences = await this.emailSequenceService.getSequences(tenantId);
    return { data: sequences };
  }

  @Post('seed/preorder-launch')
  @ApiOperation({ summary: 'Seed pre-order launch email sequence (admin)' })
  async seedPreorderLaunch(@TenantId() tenantId: string) {
    const sequence = await this.emailSequenceService.seedPreorderLaunchSequence(tenantId);
    return { data: sequence };
  }

  @Post(':sequenceId/enroll-all-subscribers')
  @ApiOperation({ summary: 'Enroll all active newsletter subscribers in a sequence (admin)' })
  async enrollAllSubscribers(
    @Param('sequenceId') sequenceId: string,
    @TenantId() tenantId: string,
  ) {
    const subscribers = await this.prisma.newsletterSubscriber.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, email: true },
    });

    let enrolledCount = 0;
    for (const sub of subscribers) {
      try {
        await this.emailSequenceService.enrollSubscriber(sequenceId, sub.email, sub.id);
        enrolledCount++;
      } catch {
        // Skip already enrolled
      }
    }

    return { data: { enrolledCount } };
  }

  @Post('schedule-processing')
  @ApiOperation({ summary: 'Schedule recurring email sequence processing (admin)' })
  async scheduleProcessing() {
    await this.emailSequenceService.scheduleProcessing();
    return { data: { scheduled: true } };
  }
}
