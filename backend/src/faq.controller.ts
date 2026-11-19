import {
  BadGatewayException,
  Body,
  Controller,
  HttpCode,
  Post,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebhookService } from './modules/webhook/webhook.service';
import { requiredText } from './modules/assignment/submission.service';
import { readAskerIdentity, toFaqPayload } from './faq-identity';

@Controller('faq')
export class FaqController {
  constructor(
    private readonly webhook: WebhookService,
    private readonly config: ConfigService,
  ) {}

  @Post('ask')
  @HttpCode(200)
  async ask(@Body() body: any) {
    const question = requiredText(body?.question, 'question', 4000);
    // Cổng sinh viên không gửi role; route này mặc định là sinh viên.
    const identity = readAskerIdentity(body, 'student');
    const { role, userId: studentId } = identity;

    const url = this.config.get<string>('N8N_FAQ_URL');
    if (!url) throw new BadGatewayException('Thiếu N8N_FAQ_URL');

    const result = await this.webhook.sendToN8n(
      toFaqPayload(question, identity),
      'FAQ_QUESTION',
      url,
      0,
      120000,
    );
    if (
      !result.success ||
      !result.data ||
      typeof (result.data as any).answer !== 'string'
    ) {
      throw new BadGatewayException('Workflow FAQ chưa trả câu trả lời hợp lệ');
    }

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
      studentId,
      role,
    };
  }
}
