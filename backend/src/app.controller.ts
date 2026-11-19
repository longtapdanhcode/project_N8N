import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Logger,
  Post,
  Query,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppService } from './app.service';
import { WebhookService } from './modules/webhook/webhook.service';
import { AiService } from './modules/ai/ai.service';
import { readAskerIdentity, toFaqPayload } from './faq-identity';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    private readonly appService: AppService,
    private readonly webhookService: WebhookService,
    private readonly aiService: AiService,
    private readonly configService: ConfigService,
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

  @Post('ai/ask')
  async askAi(
    @Body('question') question?: string,
    @Body() body?: any,
  ) {
    const rawQuestion =
      typeof question === 'string' && question.trim()
        ? question.trim()
        : typeof body?.question === 'string' && body.question.trim()
          ? body.question.trim()
          : '';

    if (!rawQuestion) {
      throw new BadRequestException('Câu hỏi không được để trống.');
    }

    const identity = readAskerIdentity(body);
    const { role, userId } = identity;
    const n8nUrl = this.configService.get<string>('N8N_FAQ_URL');

    // 1. Chuyển tiếp yêu cầu sang n8n FAQ Workflow (bỏ qua nếu chưa cấu hình)
    try {
      if (!n8nUrl) throw new Error('N8N_FAQ_URL chưa được cấu hình');
      this.logger.log(
        `[AppController /ai/ask] Dispatching question to n8n FAQ workflow for [${role ?? 'unknown'}] ${userId ?? 'anonymous'}`,
      );
      const result = await this.webhookService.sendToN8n(
        toFaqPayload(rawQuestion, identity),
        'FAQ_QUESTION',
        n8nUrl,
        0,
        60000,
      );

      if (
        result.success &&
        result.data &&
        typeof (result.data as any).answer === 'string'
      ) {
        const d = result.data as any;
        const confidence = Number(d.confidence ?? d.confidence_score ?? 1);
        const needsEscalation = Boolean(
          d.needsEscalation ?? d.requires_human_escalation ?? false,
        );
        const citations = Array.isArray(d.sources)
          ? d.sources.map((s: any) =>
              typeof s === 'string' ? s : s.title || s.id,
            )
          : Array.isArray(d.citations)
            ? d.citations
            : ['Quy chế học vụ VKU'];

        return {
          answer: d.answer,
          confidence_score: confidence,
          confidence,
          citations,
          sources: d.sources ?? [],
          requires_human_escalation: needsEscalation,
          needsEscalation,
          suggested_actions: d.suggested_actions || [
            'Tra cứu văn bản trường',
            'Liên hệ Cố vấn học tập',
          ],
          dispatched_to_n8n: true,
          studentId: userId,
          role,
        };
      }
    } catch (n8nError: any) {
      this.logger.warn(
        `n8n FAQ webhook invocation failed (${n8nError?.message}), falling back to internal AiService.`,
      );
    }

    // 2. Fallback sang dịch vụ RAG nội bộ nếu n8n gián đoạn
    const fallbackRes = await this.aiService.askAssistant(rawQuestion);
    return {
      ...fallbackRes,
      dispatched_to_n8n: false,
      studentId: userId,
      role,
    };
  }
}
