import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { WebhookService } from './webhook.service';

describe('WebhookService', () => {
  let service: WebhookService;

  const mockSecret = 'test_secret_key_123';
  const mockWebhookUrl = 'https://n8n.example.com/webhook/test';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'N8N_WEBHOOK_URL') return mockWebhookUrl;
              if (key === 'WEBHOOK_SECRET') return mockSecret;
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<WebhookService>(WebhookService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should generate HMAC-SHA256 signature and POST payload to n8n webhook', async () => {
    const payload = { assignmentId: 'asg-1', score: 95 };
    const eventType = 'ASSIGNMENT_ANALYZED';
    const rawPayload = JSON.stringify(payload);
    const expectedSignature = crypto
      .createHmac('sha256', mockSecret)
      .update(rawPayload, 'utf8')
      .digest('hex');

    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: {
        get: (header: string) => (header === 'content-type' ? 'application/json' : null),
      },
      json: jest.fn().mockResolvedValue({ received: true }),
    });
    global.fetch = mockFetch;

    const result = await service.sendToN8n(payload, eventType);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      mockWebhookUrl,
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Signature': expectedSignature,
          'X-Event-Type': eventType,
        },
        body: rawPayload,
      }),
    );
    expect(result.success).toBe(true);
    expect(result.statusCode).toBe(200);
    expect(result.data).toEqual({ received: true });
  });

  it('should correctly verify valid and reject invalid signatures', () => {
    const body = Buffer.from(JSON.stringify({ test: 'data' }));
    const validSignature = crypto
      .createHmac('sha256', mockSecret)
      .update(body)
      .digest('hex');

    expect(service.verifySignature(body, validSignature)).toBe(true);
    expect(service.verifySignature(body, 'invalid_signature_hex_value')).toBe(false);
  });
});
