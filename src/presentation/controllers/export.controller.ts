import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiHeader } from '@nestjs/swagger';
import { ServiceKeyGuard } from '../../infrastructure/auth/service-key.guard.js';
import { TenantId } from '../../infrastructure/tenant/tenant-id.decorator.js';
import { ExportService } from '../../application/export/services/export.service.js';

@ApiTags('Export')
@Controller('export')
@UseGuards(ServiceKeyGuard)
@ApiHeader({ name: 'x-service-key', required: true })
@ApiHeader({ name: 'x-tenant-id', required: true })
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('orders')
  async getOrders(
    @TenantId() tenantId: string,
    @Query('since') since?: string,
  ) {
    const data = await this.exportService.getOrders(tenantId, since);
    return { data };
  }

  @Get('customers')
  async getCustomers(
    @TenantId() tenantId: string,
    @Query('since') since?: string,
  ) {
    const data = await this.exportService.getCustomers(tenantId, since);
    return { data };
  }
}
