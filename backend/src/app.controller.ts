import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { WebhookService } from './modules/webhook/webhook.service';
import { AiService } from './modules/ai/ai.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly webhookService: WebhookService,
    private readonly aiService: AiService,
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

  @Get('test-hybrid-search')
  async testHybridSearchGet(@Query('query') query?: string) {
    const searchQuery = query || 'Quy chế học vụ VKU vắng quá 20% số buổi';
    const results = await this.aiService.hybridSearch(searchQuery);

    return {
      success: true,
      query: searchQuery,
      total: results.length,
      data: results,
    };
  }

  @Post('test-hybrid-search')
  async testHybridSearch(@Body('query') query?: string) {
    const searchQuery = query || 'Quy chế học vụ VKU vắng quá 20% số buổi';
    const results = await this.aiService.hybridSearch(searchQuery);

    return {
      success: true,
      query: searchQuery,
      total: results.length,
      data: results,
    };
  }
}
