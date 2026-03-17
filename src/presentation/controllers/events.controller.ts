import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { EventsService } from '../../application/events/services/events.service.js';
import { ServiceKeyGuard } from '../../infrastructure/auth/service-key.guard.js';

@ApiTags('Events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post('receive')
  @UseGuards(ServiceKeyGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Receive inbound events from ImportBrain (ServiceKey-protected)',
  })
  async receive(
    @Req() req: { tenantId: string },
    @Headers('x-event-type') eventType: string,
    @Body() body: { event: string; timestamp: string; data: Record<string, unknown> },
  ) {
    await this.eventsService.processInbound({
      event: body.event ?? eventType,
      tenantId: req.tenantId,
      data: body.data,
      timestamp: body.timestamp,
    });
    return { received: true };
  }
}
