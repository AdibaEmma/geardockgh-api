import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ServiceKeyGuard } from '../../infrastructure/auth/service-key.guard.js';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  @Post('importbrain/batch-arrival')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ServiceKeyGuard)
  @ApiOperation({ summary: 'ImportBrain batch arrival webhook' })
  async batchArrival(
    @Body() body: { batchId: string; productIds: string[]; tenantId: string },
  ) {
    this.logger.log(`Batch arrival notification: batch ${body.batchId}, products: ${body.productIds.join(', ')}`);
    // Will be wired to EventsService for balance request notifications in Phase 5 wiring
    return { status: 'received' };
  }
}
