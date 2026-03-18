import {
  Controller,
  Post,
  Delete,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard.js';
import { RolesGuard } from '../../infrastructure/auth/roles.guard.js';
import { Roles } from '../../infrastructure/auth/roles.decorator.js';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator.js';
import { ImportBrainConnectionService } from '../../application/integrations/services/importbrain-connection.service.js';

@ApiTags('Admin - Integrations')
@Controller('admin/integrations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminIntegrationsController {
  constructor(
    private readonly importBrainConnectionService: ImportBrainConnectionService,
  ) {}

  @Post('importbrain/platform-key')
  async savePlatformKey(
    @CurrentUser('tenantId') tenantId: string,
    @Body() body: { platformKey: string },
  ) {
    await this.importBrainConnectionService.savePlatformKey(tenantId, body.platformKey);
    return { success: true };
  }

  @Post('importbrain/connect')
  async connect(@CurrentUser('tenantId') tenantId: string) {
    return this.importBrainConnectionService.connect(tenantId);
  }

  @Delete('importbrain/disconnect')
  @HttpCode(HttpStatus.NO_CONTENT)
  async disconnect(@CurrentUser('tenantId') tenantId: string) {
    await this.importBrainConnectionService.disconnect(tenantId);
  }

  @Delete('importbrain/connection')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteConnection(@CurrentUser('tenantId') tenantId: string) {
    await this.importBrainConnectionService.deleteConnection(tenantId);
  }

  @Post('importbrain/platform-key/update')
  async updatePlatformKey(
    @CurrentUser('tenantId') tenantId: string,
    @Body() body: { platformKey: string },
  ) {
    await this.importBrainConnectionService.updatePlatformKey(tenantId, body.platformKey);
    return { success: true };
  }

  @Get('importbrain/status')
  async getStatus(@CurrentUser('tenantId') tenantId: string) {
    return this.importBrainConnectionService.getStatus(tenantId);
  }
}
