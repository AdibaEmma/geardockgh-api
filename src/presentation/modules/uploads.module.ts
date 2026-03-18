import { Module } from '@nestjs/common';
import { CloudinaryService } from '../../application/uploads/services/cloudinary.service.js';
import { AdminUploadsController } from '../controllers/admin-uploads.controller.js';

@Module({
  controllers: [AdminUploadsController],
  providers: [CloudinaryService],
  exports: [CloudinaryService],
})
export class UploadsModule {}
