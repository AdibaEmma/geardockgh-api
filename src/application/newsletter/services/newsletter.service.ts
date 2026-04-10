import { Injectable, Logger, Optional } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service.js';
import { ResendEmailService } from '../../notifications/services/resend-email.service.js';
import { EmailSequenceService } from '../../email-sequences/services/email-sequence.service.js';
import { LeadService } from '../../leads/services/lead.service.js';

@Injectable()
export class NewsletterService {
  private readonly logger = new Logger(NewsletterService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: ResendEmailService,
    @Optional() private readonly emailSequenceService?: EmailSequenceService,
    @Optional() private readonly leadService?: LeadService,
  ) {}

  async subscribe(email: string, tenantId: string, source = 'website') {
    const normalizedEmail = email.toLowerCase().trim();

    const existing = await this.prisma.newsletterSubscriber.findUnique({
      where: { email_tenantId: { email: normalizedEmail, tenantId } },
    });

    if (existing) {
      if (!existing.isActive) {
        await this.prisma.newsletterSubscriber.update({
          where: { id: existing.id },
          data: { isActive: true, unsubscribedAt: null, source },
        });
        this.logger.log(`Resubscribed: ${normalizedEmail}`);
        return { subscribed: true, resubscribed: true };
      }
      return { subscribed: true, alreadySubscribed: true };
    }

    await this.prisma.newsletterSubscriber.create({
      data: { email: normalizedEmail, tenantId, source },
    });

    const subscriber = await this.prisma.newsletterSubscriber.findUnique({
      where: { email_tenantId: { email: normalizedEmail, tenantId } },
    });

    this.logger.log(`New subscriber: ${normalizedEmail} (source: ${source})`);

    // Track as lead
    this.leadService
      ?.recordActivity(normalizedEmail, tenantId, 'newsletter_signup', {
        source: 'NEWSLETTER',
        metadata: { source },
      })
      .catch(() => {}); // fire-and-forget

    await this.sendWelcomeEmail(normalizedEmail);
    await this.autoEnrollInActiveSequences(normalizedEmail, subscriber?.id ?? '', tenantId);

    return { subscribed: true };
  }

  async unsubscribe(email: string, tenantId: string) {
    const normalizedEmail = email.toLowerCase().trim();

    const existing = await this.prisma.newsletterSubscriber.findUnique({
      where: { email_tenantId: { email: normalizedEmail, tenantId } },
    });

    if (!existing || !existing.isActive) {
      return { unsubscribed: true };
    }

    await this.prisma.newsletterSubscriber.update({
      where: { id: existing.id },
      data: { isActive: false, unsubscribedAt: new Date() },
    });

    this.logger.log(`Unsubscribed: ${normalizedEmail}`);
    return { unsubscribed: true };
  }

  async getSubscriberCount(tenantId: string): Promise<number> {
    return this.prisma.newsletterSubscriber.count({
      where: { tenantId, isActive: true },
    });
  }

  private async autoEnrollInActiveSequences(
    email: string,
    subscriberId: string,
    tenantId: string,
  ): Promise<void> {
    if (!this.emailSequenceService) return;

    try {
      const activeSequences = await this.prisma.emailSequence.findMany({
        where: { tenantId, status: 'ACTIVE' },
        select: { id: true },
      });

      for (const seq of activeSequences) {
        try {
          await this.emailSequenceService.enrollSubscriber(seq.id, email, subscriberId);
        } catch {
          // Skip if already enrolled
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to auto-enroll ${email} in sequences: ${msg}`);
    }
  }

  private async sendWelcomeEmail(email: string): Promise<void> {
    const html = `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #080808; color: #F5F0E8;">
        <h1 style="font-size: 24px; margin-bottom: 16px; color: #F0A500;">Welcome to GearDockGH</h1>
        <p style="font-size: 15px; line-height: 1.6; color: #cccccc;">
          You're in. You'll be the first to know when new gear drops — bundles,
          restocks, and exclusive pre-order windows.
        </p>
        <p style="font-size: 15px; line-height: 1.6; color: #cccccc;">
          As a thank you, enjoy <strong style="color: #F0A500;">10% off</strong> your first order.
          Use code <strong style="color: #F0A500;">WELCOME10</strong> at checkout.
        </p>
        <a href="https://geardockgh.com/products"
           style="display: inline-block; margin-top: 20px; padding: 12px 28px; background: #F0A500; color: #080808; font-weight: 600; text-decoration: none; border-radius: 8px;">
          Browse the Catalog
        </a>
        <p style="font-size: 12px; color: #666; margin-top: 32px;">
          GearDockGH &middot; Premium gear for Ghana's digital pros
        </p>
      </div>
    `;

    await this.emailService.sendEmail({
      to: email,
      subject: "You're in — welcome to GearDockGH",
      html,
    });
  }
}
