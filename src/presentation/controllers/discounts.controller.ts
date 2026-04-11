import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DiscountService } from '../../application/discounts/services/discount.service.js';
import { TenantId } from '../../infrastructure/tenant/tenant-id.decorator.js';

@ApiTags('Discounts')
@Controller('discounts')
export class DiscountsController {
  constructor(private readonly discountService: DiscountService) {}

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate a discount code (public)' })
  async validate(
    @Body() body: { code: string; subtotalPesewas: number },
    @TenantId() tenantId: string,
  ) {
    return this.discountService.validate(body.code, body.subtotalPesewas, tenantId);
  }
}
