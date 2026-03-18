import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

export interface PreorderEventJobData {
  type: 'preorder_created';
  tenantId: string;
  preorderId: string;
  payload: Record<string, unknown>;
}

@Processor('preorder-events')
export class PreorderEventProcessor extends WorkerHost {
  private readonly logger = new Logger(PreorderEventProcessor.name);

  async process(job: Job<PreorderEventJobData>): Promise<void> {
    this.logger.log(`Processing preorder event job ${job.id}: ${job.data.type}`);
    // Outbound event dispatch will be handled when PreordersService is wired
  }
}
