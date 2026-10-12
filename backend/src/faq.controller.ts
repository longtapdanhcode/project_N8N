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
    const studentId =
      body?.studentId === undefined
        ? undefined
        : requiredText(body.studentId, 'studentId', 100);
    const url = this.config.get<string>('N8N_FAQ_URL');
    if (!url) throw new BadGatewayException('Thiếu N8N_FAQ_URL');
    const result = await this.webhook.sendToN8n(
      { question, studentId },
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
    return result.data;
  }
}
