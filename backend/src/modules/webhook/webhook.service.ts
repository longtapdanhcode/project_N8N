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
   *
   * @param payload The arbitrary data payload to transmit to n8n
   * @param eventType Distinct event identifier (e.g. 'ASSIGNMENT_ANALYZED', 'THESIS_MILESTONE_UPDATED')
   * @returns WebhookDeliveryResult containing status and upstream response
   */
  async sendToN8n(payload: any, eventType: string): Promise<WebhookDeliveryResult> {
    const webhookUrl = this.configService.get<string>('N8N_WEBHOOK_URL');
    const secretKey = this.configService.get<string>('WEBHOOK_SECRET');

    if (!webhookUrl) {
      const errorMsg = 'N8N_WEBHOOK_URL is not defined in application configuration.';
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

    try {
      // 3. Make POST request using native fetch with X-Signature header and raw stringified body
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Signature': signature,
          'X-Event-Type': eventType,
        },
        body: rawPayload,
      });

      let responseBody: any;
      const contentType = response.headers.get('content-type') ?? '';

      if (contentType.includes('application/json')) {
        responseBody = await response.json();
      } else {
        responseBody = await response.text();
      }

      if (!response.ok) {
        this.logger.error(
          `n8n webhook responded with non-2xx status code: ${response.status} (${response.statusText}). Body: ${JSON.stringify(responseBody)}`,
        );
        return {
          success: false,
          statusCode: response.status,
          data: responseBody,
        };
      }

      this.logger.log(`n8n webhook event "${eventType}" successfully delivered (HTTP ${response.status})`);
      return {
        success: true,
        statusCode: response.status,
        data: responseBody,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send webhook to n8n: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
      throw error;
    }
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
