import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../../infrastructure/database/prisma.service.js';

@Injectable()
export class EmailSequenceService {
  private readonly logger = new Logger(EmailSequenceService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('email-sequences') private readonly sequenceQueue: Queue,
  ) {}

  async createSequence(
    tenantId: string,
    data: {
      name: string;
      description?: string;
      steps: { stepOrder: number; delayHours: number; subject: string; htmlBody: string }[];
    },
  ) {
    const sequence = await this.prisma.emailSequence.create({
      data: {
        tenantId,
        name: data.name,
        description: data.description,
        steps: {
          create: data.steps,
        },
      },
      include: { steps: true },
    });

    this.logger.log(`Email sequence created: ${sequence.name} with ${data.steps.length} steps`);
    return sequence;
  }

  async enrollSubscriber(sequenceId: string, email: string, subscriberId: string) {
    const sequence = await this.prisma.emailSequence.findFirst({
      where: { id: sequenceId, status: 'ACTIVE' },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });

    if (!sequence) {
      throw new NotFoundException('Sequence not found or not active');
    }

    const firstStep = sequence.steps[0];
    if (!firstStep) {
      this.logger.warn(`Sequence ${sequenceId} has no steps`);
      return null;
    }

    const enrollment = await this.prisma.emailSequenceEnrollment.upsert({
      where: {
        sequenceId_email: { sequenceId, email },
      },
      update: {},
      create: {
        sequenceId,
        subscriberId,
        email,
        currentStepOrder: firstStep.stepOrder,
        nextSendAt: new Date(Date.now() + firstStep.delayHours * 3600000),
      },
    });

    this.logger.log(`Enrolled ${email} in sequence ${sequence.name}`);
    return enrollment;
  }

  async cancelEnrollment(sequenceId: string, email: string) {
    const enrollment = await this.prisma.emailSequenceEnrollment.findUnique({
      where: { sequenceId_email: { sequenceId, email } },
    });

    if (!enrollment) return { cancelled: false };

    await this.prisma.emailSequenceEnrollment.update({
      where: { id: enrollment.id },
      data: { cancelledAt: new Date() },
    });

    return { cancelled: true };
  }

  async scheduleProcessing() {
    await this.sequenceQueue.add(
      'process-pending-steps',
      { type: 'process-pending-steps' },
      {
        repeat: { every: 300000 },
        jobId: 'email-sequence-processor',
      },
    );

    this.logger.log('Email sequence processing scheduled (every 5 minutes)');
  }

  async getSequences(tenantId: string) {
    return this.prisma.emailSequence.findMany({
      where: { tenantId },
      include: {
        steps: { orderBy: { stepOrder: 'asc' } },
        _count: { select: { enrollments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async seedPreorderLaunchSequence(tenantId: string) {
    const existing = await this.prisma.emailSequence.findFirst({
      where: { tenantId, name: 'Pre-Order Launch' },
    });

    if (existing) {
      this.logger.log('Pre-order launch sequence already exists');
      return existing;
    }

    return this.createSequence(tenantId, {
      name: 'Pre-Order Launch',
      description: '3-email pre-order launch sequence: teaser, offer reveal, last chance',
      steps: [
        {
          stepOrder: 0,
          delayHours: 0,
          subject: "Something big is coming to Ghana",
          htmlBody: this.teaserEmailTemplate(),
        },
        {
          stepOrder: 1,
          delayHours: 72,
          subject: "Pre-orders are LIVE — limited first batch",
          htmlBody: this.offerRevealTemplate(),
        },
        {
          stepOrder: 2,
          delayHours: 120,
          subject: "Last chance — pre-orders close soon",
          htmlBody: this.lastChanceTemplate(),
        },
      ],
    });
  }

  private teaserEmailTemplate(): string {
    return `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #080808; color: #F5F0E8;">
        <h1 style="font-size: 24px; margin-bottom: 16px; color: #F0A500;">Something big is coming</h1>
        <p style="font-size: 15px; line-height: 1.6; color: #cccccc;">
          You've been asking when GearDockGH goes live with pre-orders. The answer: very soon.
        </p>
        <p style="font-size: 15px; line-height: 1.6; color: #cccccc;">
          We're dropping our first import batch &mdash; curated bundles for remote workers,
          creators, and gamers. Limited units, priced in cedis, MoMo accepted.
        </p>
        <p style="font-size: 15px; line-height: 1.6; color: #cccccc;">
          We'll send you the full list in a few days. Stay tuned.
        </p>
        <p style="font-size: 14px; color: #888; margin-top: 32px;">
          &mdash; The GearDockGH team
        </p>
        <p style="font-size: 12px; color: #555; margin-top: 24px;">
          GearDockGH &middot; Premium gear for Ghana's digital pros
        </p>
      </div>
    `;
  }

  private offerRevealTemplate(): string {
    return `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #080808; color: #F5F0E8;">
        <h1 style="font-size: 24px; margin-bottom: 16px; color: #F0A500;">Pre-orders are LIVE</h1>
        <p style="font-size: 15px; line-height: 1.6; color: #cccccc;">
          The first batch is here. Three curated bundles, limited units:
        </p>
        <div style="margin: 20px 0; padding: 16px; border: 1px solid #222; border-radius: 8px;">
          <p style="margin: 8px 0; color: #F0A500; font-weight: 600;">The Desk That Means Business &mdash; GH&#8373; 750 <span style="color: #888; text-decoration: line-through;">GH&#8373; 890</span></p>
          <p style="margin: 8px 0; color: #F0A500; font-weight: 600;">The Studio Upgrade &mdash; GH&#8373; 1,350 <span style="color: #888; text-decoration: line-through;">GH&#8373; 1,600</span></p>
          <p style="margin: 8px 0; color: #F0A500; font-weight: 600;">The Setup That Levels You Up &mdash; GH&#8373; 1,000 <span style="color: #888; text-decoration: line-through;">GH&#8373; 1,200</span></p>
        </div>
        <p style="font-size: 15px; line-height: 1.6; color: #cccccc;">
          Pay with MoMo. Delivered within 48h in Bolgatanga. 7-day returns.
        </p>
        <a href="https://geardockgh.com/products"
           style="display: inline-block; margin-top: 20px; padding: 14px 32px; background: #F0A500; color: #080808; font-weight: 700; text-decoration: none; border-radius: 8px; font-size: 15px;">
          Pre-Order My Setup
        </a>
        <p style="font-size: 13px; color: #888; margin-top: 16px;">
          These are real stock numbers &mdash; when they're gone, next batch is 6 weeks away.
        </p>
        <p style="font-size: 12px; color: #555; margin-top: 32px;">
          GearDockGH &middot; Premium gear for Ghana's digital pros
        </p>
      </div>
    `;
  }

  private lastChanceTemplate(): string {
    return `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #080808; color: #F5F0E8;">
        <h1 style="font-size: 24px; margin-bottom: 16px; color: #F0A500;">Last chance &mdash; pre-orders close soon</h1>
        <p style="font-size: 15px; line-height: 1.6; color: #cccccc;">
          Quick update: units are running low from the first batch.
        </p>
        <p style="font-size: 15px; line-height: 1.6; color: #cccccc;">
          After pre-orders close, we process the next import. That's another 6-week wait.
        </p>
        <p style="font-size: 15px; line-height: 1.6; color: #cccccc;">
          If you've been thinking about it &mdash; now's the time.
        </p>
        <a href="https://geardockgh.com/products"
           style="display: inline-block; margin-top: 20px; padding: 14px 32px; background: #F0A500; color: #080808; font-weight: 700; text-decoration: none; border-radius: 8px; font-size: 15px;">
          Grab My Setup Before It's Gone
        </a>
        <p style="font-size: 12px; color: #555; margin-top: 32px;">
          GearDockGH &middot; Premium gear for Ghana's digital pros
        </p>
      </div>
    `;
  }
}
