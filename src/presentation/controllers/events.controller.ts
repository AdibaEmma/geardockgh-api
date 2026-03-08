import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { EventsService } from '../../application/events/services/events.service.js';
import { EventPayloadDto } from '../../application/events/dtos/event-payload.dto.js';
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
  async receive(@Body() payload: EventPayloadDto) {
    await this.eventsService.processInbound(payload);
    return { received: true };
  }
}
