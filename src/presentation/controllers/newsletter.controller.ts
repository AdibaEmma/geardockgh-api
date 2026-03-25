import { Body, Controller, Delete, Get, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { NewsletterService } from '../../application/newsletter/services/newsletter.service.js';
import { SubscribeNewsletterDto } from '../../application/newsletter/dtos/subscribe-newsletter.dto.js';
import { TenantId } from '../../infrastructure/tenant/tenant-id.decorator.js';

@ApiTags('Newsletter')
@Controller('newsletter')
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  @Post('subscribe')
  @ApiOperation({ summary: 'Subscribe to newsletter' })
  async subscribe(
    @Body() dto: SubscribeNewsletterDto,
    @TenantId() tenantId: string,
  ) {
    const result = await this.newsletterService.subscribe(
      dto.email,
      tenantId,
      dto.source,
    );
    return { data: result };
  }

  @Delete('unsubscribe')
  @ApiOperation({ summary: 'Unsubscribe from newsletter' })
  async unsubscribe(
    @Query('email') email: string,
    @TenantId() tenantId: string,
  ) {
    const result = await this.newsletterService.unsubscribe(email, tenantId);
    return { data: result };
  }

  @Get('count')
  @ApiOperation({ summary: 'Get active subscriber count' })
  async getCount(@TenantId() tenantId: string) {
    const count = await this.newsletterService.getSubscriberCount(tenantId);
    return { data: { count } };
  }
}
