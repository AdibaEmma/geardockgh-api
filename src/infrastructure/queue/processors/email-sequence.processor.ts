import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../database/prisma.service.js';
import { ResendEmailService } from '../../../application/notifications/services/resend-email.service.js';

export interface EmailSequenceJobData {
  type: 'process-pending-steps';
}

@Processor('email-sequences')
export class EmailSequenceProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailSequenceProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: ResendEmailService,
  ) {
    super();
  }

  async process(job: Job<EmailSequenceJobData>): Promise<void> {
    this.logger.log(`Processing email sequence job: ${job.data.type}`);

    if (job.data.type === 'process-pending-steps') {
      await this.processPendingSteps();
    }
  }

  private async processPendingSteps(): Promise<void> {
    const now = new Date();

    const dueEnrollments = await this.prisma.emailSequenceEnrollment.findMany({
      where: {
        isComplete: false,
        cancelledAt: null,
        nextSendAt: { lte: now },
      },
      include: {
        sequence: {
          include: {
            steps: { orderBy: { stepOrder: 'asc' } },
          },
        },
      },
      take: 50,
    });

    this.logger.log(`Found ${dueEnrollments.length} due enrollment(s)`);

    for (const enrollment of dueEnrollments) {
      try {
        const currentStep = enrollment.sequence.steps.find(
          (s) => s.stepOrder === enrollment.currentStepOrder,
        );

        if (!currentStep) {
          await this.prisma.emailSequenceEnrollment.update({
            where: { id: enrollment.id },
            data: { isComplete: true },
          });
          continue;
        }

        const sent = await this.emailService.sendEmail({
          to: enrollment.email,
          subject: currentStep.subject,
          html: currentStep.htmlBody,
        });

        if (!sent) {
          this.logger.warn(`Failed to send step ${currentStep.stepOrder} to ${enrollment.email}`);
          continue;
        }

        const nextStepOrder = enrollment.currentStepOrder + 1;
        const nextStep = enrollment.sequence.steps.find(
          (s) => s.stepOrder === nextStepOrder,
        );

        await this.prisma.emailSequenceEnrollment.update({
          where: { id: enrollment.id },
          data: {
            currentStepOrder: nextStepOrder,
            isComplete: !nextStep,
            nextSendAt: nextStep
              ? new Date(now.getTime() + nextStep.delayHours * 3600000)
              : null,
          },
        });

        this.logger.log(
          `Sent step ${currentStep.stepOrder} to ${enrollment.email} (sequence: ${enrollment.sequence.name})`,
        );
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.error(`Error processing enrollment ${enrollment.id}: ${msg}`);
      }
    }
  }
}
