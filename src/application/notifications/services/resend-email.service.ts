import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfiguration } from '../../../infrastructure/config/app.config.js';

@Injectable()
export class ResendEmailService {
  private readonly logger = new Logger(ResendEmailService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.resend.com';
  private readonly fromEmail = 'GearDockGH <noreply@geardockgh.com>';

  constructor(configService: ConfigService) {
    const appConf = configService.get<AppConfiguration>('app')!;
    this.apiKey = appConf.resend.apiKey;
  }

  async sendEmail(params: {
    to: string;
    subject: string;
    html: string;
  }): Promise<boolean> {
    if (!this.apiKey) {
      this.logger.warn('Resend API key not configured — skipping email');
      return false;
    }

    try {
      const response = await fetch(`${this.baseUrl}/emails`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.fromEmail,
          to: [params.to],
          subject: params.subject,
          html: params.html,
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        this.logger.error(`Resend email failed (${response.status}): ${body}`);
        return false;
      }

      this.logger.log(`Email sent to ${params.to}: ${params.subject}`);
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Resend email error: ${msg}`);
      return false;
    }
  }
}
