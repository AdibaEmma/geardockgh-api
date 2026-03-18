import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import type { AppConfiguration } from '../../../infrastructure/config/app.config.js';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private configured = false;

  constructor(private readonly configService: ConfigService) {
    this.configure();
  }

  private configure() {
    if (this.configured) return;

    const config = this.configService.get<AppConfiguration>('app')!.cloudinary;

    if (!config.cloudName || !config.apiKey || !config.apiSecret) {
      this.logger.warn('Cloudinary not configured — image deletion will be skipped');
      return;
    }

    cloudinary.config({
      cloud_name: config.cloudName,
      api_key: config.apiKey,
      api_secret: config.apiSecret,
    });

    this.logger.log(`Cloudinary configured for cloud: ${config.cloudName}`);
    this.configured = true;
  }

  async deleteImage(publicId: string): Promise<boolean> {
    if (!this.configured) {
      this.logger.warn('Cloudinary not configured — skipping delete');
      return false;
    }

    try {
      const result = await cloudinary.uploader.destroy(publicId);
      this.logger.log(`Deleted image ${publicId}: ${result.result}`);
      return result.result === 'ok';
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to delete image ${publicId}: ${msg}`);
      return false;
    }
  }

  async deleteImages(publicIds: string[]): Promise<void> {
    if (!this.configured || publicIds.length === 0) return;

    await Promise.allSettled(publicIds.map((id) => this.deleteImage(id)));
  }

  /**
   * Extracts the Cloudinary public_id from a secure_url.
   * E.g. https://res.cloudinary.com/xxx/image/upload/v123/geardockgh/products/abc.jpg
   * → geardockgh/products/abc
   */
  extractPublicId(url: string): string | null {
    try {
      const match = url.match(/\/upload\/(?:v\d+\/)?(.*?)(?:\.\w+)?$/);
      return match?.[1] ?? null;
    } catch {
      return null;
    }
  }
}
