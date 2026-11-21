import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface WebhookDeliveryResult<T = any> {
  success: boolean;
  statusCode: number;
  data?: T;
}

export interface WebhookOptions {
  /**
   * Cho phép gửi lại cả khi không rõ n8n đã xử lý chưa (quá thời gian chờ, HTTP 500).
   * Chỉ bật khi workflow tự bỏ trùng theo X-Delivery-Id; mặc định tắt để không
   * đăng ký học phần hay gửi email cảnh báo hai lần.
   */
  idempotent?: boolean;
  /** Tổng thời gian tối đa, tính cả các lần thử lại và thời gian chờ giữa chúng. */
  deadlineMs?: number;
  /** Mã giữ nguyên qua các lần gửi lại (ví dụ Idempotency-Key của PWA) để n8n bỏ trùng. */
  deliveryId?: string;
}

/** Lỗi kết nối xảy ra trước khi request tới được n8n: gửi lại luôn an toàn. */
const NOT_DELIVERED = new Set([
  'ECONNREFUSED',
  'ENOTFOUND',
  'EAI_AGAIN',
  'EHOSTUNREACH',
  'ENETUNREACH',
]);
/** n8n hoặc proxy phía trước báo chưa nhận xử lý: gửi lại an toàn. */
const RETRY_STATUSES = new Set([429, 502, 503, 504]);
const BACKOFF_MS = [1000, 2000, 4000];
export const DEFAULT_DEADLINE_MS = 20000;
const MAX_ID_LENGTH = 200;

/** Giây hoặc ngày giờ HTTP trong Retry-After → mili giây, null nếu không đọc được. */
export function parseRetryAfter(value: string | null, now = Date.now()) {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const at = Date.parse(value);
  return Number.isNaN(at) ? null : Math.max(0, at - now);
}

/** Mã chống trùng từ client: chỉ nhận chuỗi ngắn, an toàn để đặt vào header. */
export function safeDeliveryId(value: unknown) {
  return typeof value === 'string' &&
    value.length > 0 &&
    value.length <= MAX_ID_LENGTH &&
    /^[\w.:-]+$/.test(value)
    ? value
    : undefined;
}

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(private readonly configService: ConfigService) {}

  /** Tách ra để test thay được thời gian chờ. */
  protected sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Gửi sự kiện tới workflow n8n, ký HMAC-SHA256 (header x-signature).
   *
   * Chỉ tự gửi lại khi chắc n8n chưa xử lý: lỗi kết nối, HTTP 429/502/503/504.
   * Quá thời gian chờ hoặc HTTP 500 thì có thể n8n đã chạy xong một phần, nên chỉ
   * gửi lại khi options.idempotent. Mọi lần gửi dùng chung X-Delivery-Id và không
   * vượt quá deadlineMs.
   *
   * @param maxRetries Số lần gửi lại tối đa (mặc định 3)
   * @param timeoutMs Thời gian chờ mỗi lần gửi, gồm cả đọc phản hồi (mặc định 8000)
   */
  async sendToN8n(
    payload: any,
    eventType: string,
    overrideUrl?: string,
    maxRetries = 3,
    timeoutMs = 8000,
    options: WebhookOptions = {},
  ): Promise<WebhookDeliveryResult> {
    const webhookUrl =
      overrideUrl || this.configService.get<string>('N8N_WEBHOOK_URL');
    const secretKey = this.configService.get<string>('WEBHOOK_SECRET');

    if (!webhookUrl) {
      const errorMsg = 'Target webhook URL is not defined in configuration.';
      this.logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    if (!secretKey) {
      const errorMsg = 'WEBHOOK_SECRET is not defined in application configuration.';
      this.logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    const rawPayload = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(rawPayload, 'utf8')
      .digest('hex');
    const deliveryId = safeDeliveryId(options.deliveryId) ?? crypto.randomUUID();
    // Không đặt hạn chung ngắn hơn một lần gửi (ví dụ gọi một lần với timeout 120 giây).
    const deadline =
      Date.now() + (options.deadlineMs ?? Math.max(DEFAULT_DEADLINE_MS, timeoutMs));

    this.logger.log(
      `Dispatching webhook event "${eventType}" (${deliveryId}) to n8n: ${webhookUrl}`,
    );

    let last: WebhookDeliveryResult = {
      success: false,
      statusCode: 504,
      data: { error: 'Hết thời gian gửi tới n8n' },
    };

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const remaining = deadline - Date.now();
      if (remaining <= 0) break;
      const label = `n8n webhook "${eventType}" attempt ${attempt + 1}/${maxRetries + 1}`;
      let retryable = false;
      let waitMs: number | null = null;

      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-signature': `sha256=${signature}`,
            'X-Event-Type': eventType,
            'X-Delivery-Id': deliveryId,
            'X-Delivery-Attempt': String(attempt + 1),
          },
          body: rawPayload,
          // Gồm cả thời gian đọc phản hồi.
          signal: AbortSignal.timeout(Math.min(timeoutMs, remaining)),
        });

        const rawText = await response.text();
        let responseBody: any = rawText;
        const contentType = response.headers.get('content-type') ?? '';
        if (rawText && rawText.trim().length > 0 && contentType.includes('application/json')) {
          try {
            responseBody = JSON.parse(rawText);
          } catch {
            responseBody = rawText;
          }
        }

        if (response.ok) {
          this.logger.log(
            `n8n webhook event "${eventType}" successfully delivered (HTTP ${response.status})`,
          );
          return { success: true, statusCode: response.status, data: responseBody };
        }

        last = { success: false, statusCode: response.status, data: responseBody };
        retryable =
          RETRY_STATUSES.has(response.status) ||
          (response.status === 500 && !!options.idempotent);
        if (response.status === 429)
          waitMs = parseRetryAfter(response.headers.get('retry-after'));
        this.logger.warn(`${label} responded with HTTP ${response.status}`);
      } catch (error: any) {
        const timedOut = error?.name === 'TimeoutError' || error?.name === 'AbortError';
        const code = error?.cause?.code ?? error?.code;
        const message = timedOut
          ? `Timeout after ${Math.min(timeoutMs, remaining)}ms`
          : error?.message || String(error);
        last = {
          success: false,
          statusCode: timedOut ? 504 : 502,
          data: { error: message },
        };
        retryable = NOT_DELIVERED.has(code) || !!options.idempotent;
        this.logger.warn(`${label} failed: ${message}${code ? ` (${code})` : ''}`);
      }

      if (!retryable || attempt === maxRetries) break;
      const base = BACKOFF_MS[attempt] ?? BACKOFF_MS[BACKOFF_MS.length - 1];
      // Lệch ngẫu nhiên để nhiều request lỗi cùng lúc không dồn lại cùng một thời điểm.
      const delay = waitMs ?? Math.round(base * (0.5 + Math.random() * 0.5));
      if (Date.now() + delay >= deadline) break;
      await this.sleep(delay);
    }

    this.logger.error(
      `Failed to deliver "${eventType}" (${deliveryId}) to n8n: HTTP ${last.statusCode}`,
    );
    return last;
  }

  /**
   * Helper utility to verify an incoming webhook request's HMAC-SHA256 signature
   * against the preserved raw body buffer or string.
   *
   * @param rawBody The unmodified incoming request body (Buffer or string)
   * @param signature The signature provided in request headers (e.g. X-Signature)
   * @returns boolean indicating if the signature is authentic
   */
  verifySignature(rawBody: Buffer | string, signature: string): boolean {
    const secretKey = this.configService.get<string>('WEBHOOK_SECRET');
    if (!secretKey || !signature) {
      return false;
    }

    const cleanSignature = signature.replace(/^sha256=/i, '').trim();

    const computedSignature = crypto
      .createHmac('sha256', secretKey)
      .update(rawBody)
      .digest('hex');

    const sourceBuffer = Buffer.from(cleanSignature, 'hex');
    const targetBuffer = Buffer.from(computedSignature, 'hex');

    if (sourceBuffer.length !== targetBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(sourceBuffer, targetBuffer);
  }
}
