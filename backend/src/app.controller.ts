import { Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { WebhookService } from './modules/webhook/webhook.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly webhookService: WebhookService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('test-webhook')
  async testWebhook() {
    const mockPayload = {
      studentId: '22GIT123',
      action: 'attendance_warning',
      message: 'Sinh vien vang qua 20% so buoi',
      timestamp: new Date().toISOString(),
    };

    await this.webhookService.sendToN8n(mockPayload, 'TEST_EVENT');

    return {
      success: true,
      message: 'Webhook sent!',
      dataSent: mockPayload,
    };
  }
}

