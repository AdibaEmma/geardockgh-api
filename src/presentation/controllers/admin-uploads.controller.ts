import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard.js';
import { RolesGuard } from '../../infrastructure/auth/roles.guard.js';
import { Roles } from '../../infrastructure/auth/roles.decorator.js';
import { CloudinaryService } from '../../application/uploads/services/cloudinary.service.js';

@ApiTags('Admin - Uploads')
@Controller('admin/uploads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminUploadsController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  @Delete('image')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an image from Cloudinary' })
  async deleteImage(@Body() body: { url: string }) {
    const publicId = this.cloudinaryService.extractPublicId(body.url);
    if (!publicId) {
      return { deleted: false, reason: 'Could not extract public ID from URL' };
    }
    const deleted = await this.cloudinaryService.deleteImage(publicId);
    return { deleted };
  }
}
