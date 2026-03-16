import { Module } from '@nestjs/common';
import { ExportController } from '../controllers/export.controller.js';
import { ExportService } from '../../application/export/services/export.service.js';

@Module({
  controllers: [ExportController],
  providers: [ExportService],
})
export class ExportModule {}
