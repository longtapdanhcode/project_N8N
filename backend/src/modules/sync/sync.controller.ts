import {
  Controller,
  Post,
  Body,
  Headers,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import { SyncService } from './sync.service';
import { SkipPortalKey } from '../auth/portal-key.guard';
import { SupabaseStudentWebhookDto } from './dto/supabase-student-webhook.dto';

// Supabase gọi bằng SUPABASE_WEBHOOK_SECRET riêng, không đi qua cổng 3000.
@SkipPortalKey()
@Controller('api/v1/internal/sync')
export class SyncController {
  private readonly logger = new Logger(SyncController.name);

  constructor(
    private readonly syncService: SyncService,
    private readonly configService: ConfigService,
  ) {}

  @Post('supabase-student')
  @HttpCode(HttpStatus.OK)
  async handleSupabaseStudentWebhook(
    @Headers('x-webhook-secret') webhookSecret: string,
    @Body() payload: SupabaseStudentWebhookDto,
  ) {
    // Secret riêng cho webhook Supabase; không dùng lại WEBHOOK_SECRET của n8n.
    const expectedSecret = this.configService.get<string>(
      'SUPABASE_WEBHOOK_SECRET',
    );
    if (!expectedSecret || expectedSecret.length < 32) {
      this.logger.error(
        'Rejected webhook: SUPABASE_WEBHOOK_SECRET chưa cấu hình hoặc ngắn hơn 32 ký tự',
      );
      throw new ServiceUnavailableException(
        'Webhook đồng bộ sinh viên chưa được cấu hình',
      );
    }

    if (!webhookSecret || typeof webhookSecret !== 'string') {
      this.logger.warn('Rejected webhook: Missing x-webhook-secret header');
      throw new UnauthorizedException('Thiếu header x-webhook-secret');
    }

    const receivedBuf = Buffer.from(webhookSecret);
    const expectedBuf = Buffer.from(expectedSecret);

    if (
      receivedBuf.length !== expectedBuf.length ||
      !timingSafeEqual(receivedBuf, expectedBuf)
    ) {
      this.logger.warn('Rejected webhook: Invalid x-webhook-secret header');
      throw new UnauthorizedException('Khóa bí mật x-webhook-secret không hợp lệ');
    }

    return await this.syncService.syncSupabaseStudent(payload);
  }
}
