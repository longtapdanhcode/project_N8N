import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface WebhookDeliveryResult<T = any> {
  success: boolean;
  statusCode: number;
  data?: T;
}

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Dispatches an event payload to the n8n webhook workflow with HMAC-SHA256 signature authentication.
   * Includes 8000ms request timeout and exponential backoff retry.
   *
   * @param payload The arbitrary data payload to transmit to n8n
   * @param eventType Distinct event identifier (e.g. 'ASSIGNMENT_ANALYZED', 'ACADEMIC_WARNING_ALERT')
   * @param overrideUrl Optional specific webhook URL (overrides default N8N_WEBHOOK_URL)
   * @param maxRetries Maximum retry attempts (default: 3)
   * @returns WebhookDeliveryResult containing status and upstream response
   */
  async sendToN8n(
    payload: any,
    eventType: string,
    overrideUrl?: string,
    maxRetries = 3,
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

    // 1. Stringify the payload
    const rawPayload = typeof payload === 'string' ? payload : JSON.stringify(payload);

    // 2. Generate HMAC-SHA256 signature using built-in crypto module
    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(rawPayload, 'utf8')
      .digest('hex');

    this.logger.log(`Dispatching webhook event "${eventType}" to n8n: ${webhookUrl}`);

    const delays = [1000, 2000, 4000];
    let lastError: any;
    let lastResult: WebhookDeliveryResult | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Signature': signature,
            'X-Event-Type': eventType,
          },
          body: rawPayload,
          signal: controller.signal,
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

        if (!response.ok) {
          this.logger.warn(
            `n8n webhook attempt ${attempt + 1}/${maxRetries + 1} responded with non-2xx status: ${response.status}`,
          );
          lastResult = {
            success: false,
            statusCode: response.status,
            data: responseBody,
          };

          if (attempt < maxRetries && response.status >= 500) {
            const delay = delays[attempt] ?? 4000;
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }
          return lastResult;
        }

        this.logger.log(
          `n8n webhook event "${eventType}" successfully delivered (HTTP ${response.status})`,
        );
        return {
          success: true,
          statusCode: response.status,
          data: responseBody,
        };
      } catch (error: any) {
        lastError = error;
        const isAbort = error?.name === 'AbortError';
        this.logger.warn(
          `n8n webhook attempt ${attempt + 1}/${maxRetries + 1} failed: ${isAbort ? 'Timeout after 8000ms' : error?.message || error}`,
        );

        if (attempt < maxRetries) {
          const delay = delays[attempt] ?? 4000;
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      } finally {
        clearTimeout(timeoutId);
      }
    }

    if (lastResult) {
      return lastResult;
    }

    const finalMsg = lastError instanceof Error ? lastError.message : String(lastError);
    this.logger.error(`Failed to send webhook to n8n after ${maxRetries + 1} attempts: ${finalMsg}`);
    return {
      success: false,
      statusCode: 504,
      data: { error: finalMsg },
    };
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

    const computedSignature = crypto
      .createHmac('sha256', secretKey)
      .update(rawBody)
      .digest('hex');

    const sourceBuffer = Buffer.from(signature, 'hex');
    const targetBuffer = Buffer.from(computedSignature, 'hex');

    if (sourceBuffer.length !== targetBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(sourceBuffer, targetBuffer);
  }
}
