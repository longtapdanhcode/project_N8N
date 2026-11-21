import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  OnModuleInit,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { timingSafeEqual } from 'node:crypto';

export const PORTAL_KEY_HEADER = 'x-portal-key';
const SKIP_PORTAL_KEY = 'skipPortalKey';

/**
 * Bỏ khóa cổng cho route có cách xác thực riêng (n8n, webhook Supabase)
 * hoặc route công khai không có dữ liệu (kiểm tra sống).
 */
export const SkipPortalKey = () => SetMetadata(SKIP_PORTAL_KEY, true);

/** Lý do PORTAL_API_KEY không dùng được, hoặc null nếu hợp lệ / không đặt. */
export function portalKeyProblem(key: string | undefined) {
  if (!key) return null;
  if (key.length < 32) return 'PORTAL_API_KEY phải có ít nhất 32 ký tự.';
  if (new Set(key).size < 10)
    return 'PORTAL_API_KEY quá dễ đoán; hãy dùng chuỗi ngẫu nhiên.';
  return null;
}

/**
 * Backend tin MSSV/vai trò mà cổng 3000 gắn từ phiên đăng nhập. Guard này bắt
 * mọi request phải mang khóa bí mật chỉ cổng biết, để ai gọi thẳng cổng 3001
 * cũng không giả danh được người dùng.
 *
 * Chưa đặt PORTAL_API_KEY thì cho qua (chạy dev trên máy), trừ production:
 * main.ts dừng khởi động nếu production thiếu khóa.
 */
@Injectable()
export class PortalKeyGuard implements CanActivate, OnModuleInit {
  private readonly logger = new Logger(PortalKeyGuard.name);
  private expected?: Buffer;

  constructor(
    private readonly config: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  onModuleInit() {
    const key = this.config.get<string>('PORTAL_API_KEY')?.trim();
    const problem = portalKeyProblem(key);
    if (problem) throw new Error(problem);
    if (key) this.expected = Buffer.from(key);
    else
      this.logger.warn(
        'PORTAL_API_KEY chưa đặt: backend nhận request không có khóa cổng. Chỉ dùng khi chạy dev trên máy.',
      );
  }

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') return true;
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_PORTAL_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip || !this.expected) return true;
    const received = context.switchToHttp().getRequest().headers[
      PORTAL_KEY_HEADER
    ];
    if (typeof received === 'string') {
      const actual = Buffer.from(received);
      if (
        actual.length === this.expected.length &&
        timingSafeEqual(actual, this.expected)
      )
        return true;
    }
    throw new UnauthorizedException('Thiếu hoặc sai khóa cổng.');
  }
}
