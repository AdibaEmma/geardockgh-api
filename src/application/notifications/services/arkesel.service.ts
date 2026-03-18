import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfiguration } from '../../../infrastructure/config/app.config.js';

@Injectable()
export class ArkeselService {
  private readonly logger = new Logger(ArkeselService.name);
  private readonly apiKey: string;
  private readonly senderId: string;
  private readonly baseUrl = 'https://sms.arkesel.com/api/v2';

  constructor(configService: ConfigService) {
    const appConf = configService.get<AppConfiguration>('app')!;
    this.apiKey = appConf.arkesel.apiKey;
    this.senderId = appConf.arkesel.senderId;
  }

  async sendSms(to: string, message: string): Promise<boolean> {
    if (!this.apiKey) {
      this.logger.warn('Arkesel API key not configured — skipping SMS');
      return false;
    }

    try {
      const response = await fetch(`${this.baseUrl}/sms/send`, {
        method: 'POST',
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: this.senderId,
          recipients: [to],
          message,
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        this.logger.error(`Arkesel SMS failed (${response.status}): ${body}`);
        return false;
      }

      this.logger.log(`SMS sent to ${to}`);
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Arkesel SMS error: ${msg}`);
      return false;
    }
  }

  async sendWhatsApp(to: string, message: string): Promise<boolean> {
    if (!this.apiKey) {
      this.logger.warn('Arkesel API key not configured — skipping WhatsApp');
      return false;
    }

    try {
      const response = await fetch(`${this.baseUrl}/whatsapp/send`, {
        method: 'POST',
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient: to,
          message,
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        this.logger.error(`Arkesel WhatsApp failed (${response.status}): ${body}`);
        return false;
      }

      this.logger.log(`WhatsApp message sent to ${to}`);
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Arkesel WhatsApp error: ${msg}`);
      return false;
    }
  }
}
