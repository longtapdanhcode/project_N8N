import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  parseRetryAfter,
  safeDeliveryId,
  WebhookService,
} from './webhook.service';

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
    const expectedSignature = `sha256=${crypto
      .createHmac('sha256', mockSecret)
      .update(rawPayload, 'utf8')
      .digest('hex')}`;

    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: {
        get: (header: string) => (header === 'content-type' ? 'application/json' : null),
      },
      text: jest.fn().mockResolvedValue(JSON.stringify({ received: true })),
      json: jest.fn().mockResolvedValue({ received: true }),
    });
    global.fetch = mockFetch;

    const result = await service.sendToN8n(payload, eventType);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      mockWebhookUrl,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'x-signature': expectedSignature,
          'X-Event-Type': eventType,
          'X-Delivery-Attempt': '1',
        }),
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

/** Không chờ thật; ghi lại các khoảng chờ để kiểm tra. */
class TestWebhookService extends WebhookService {
  waits: number[] = [];
  protected override sleep(ms: number) {
    this.waits.push(ms);
    return Promise.resolve(undefined);
  }
}

function reply(status: number, body: unknown = {}, headers: Record<string, string> = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name: string) =>
        ({ 'content-type': 'application/json', ...headers })[name.toLowerCase()] ?? null,
    },
    text: async () => JSON.stringify(body),
  };
}

const timeoutError = () => Object.assign(new Error('aborted'), { name: 'TimeoutError' });
const refused = () =>
  Object.assign(new TypeError('fetch failed'), { cause: { code: 'ECONNREFUSED' } });

describe('WebhookService retry policy', () => {
  let service: TestWebhookService;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    service = new TestWebhookService({
      get: (key: string) =>
        key === 'WEBHOOK_SECRET' ? 'secret' : key === 'N8N_WEBHOOK_URL' ? 'http://n8n/x' : null,
    } as never);
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  const headersOf = (call: number) => fetchMock.mock.calls[call][1].headers;

  it('retries 502/503/504 with one delivery id across attempts', async () => {
    fetchMock
      .mockResolvedValueOnce(reply(503))
      .mockResolvedValueOnce(reply(502))
      .mockResolvedValueOnce(reply(200, { ok: true }));
    const result = await service.sendToN8n({ a: 1 }, 'EVT');
    expect(result).toEqual({ success: true, statusCode: 200, data: { ok: true } });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const id = headersOf(0)['X-Delivery-Id'];
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(headersOf(2)['X-Delivery-Id']).toBe(id);
    expect(headersOf(2)['X-Delivery-Attempt']).toBe('3');
    // Lệch ngẫu nhiên 50–100% của 1 s rồi 2 s.
    expect(service.waits[0]).toBeGreaterThanOrEqual(500);
    expect(service.waits[0]).toBeLessThanOrEqual(1000);
    expect(service.waits[1]).toBeGreaterThanOrEqual(1000);
    expect(service.waits[1]).toBeLessThanOrEqual(2000);
  });

  it('does not repeat after a timeout or HTTP 500 unless the workflow dedupes', async () => {
    fetchMock.mockRejectedValueOnce(timeoutError());
    const timedOut = await service.sendToN8n({}, 'COURSE_REGISTRATION');
    expect(timedOut.success).toBe(false);
    expect(timedOut.statusCode).toBe(504);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fetchMock.mockReset().mockResolvedValueOnce(reply(500, { error: 'x' }));
    const failed = await service.sendToN8n({}, 'COURSE_REGISTRATION');
    expect(failed.statusCode).toBe(500);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('repeats ambiguous failures when marked idempotent', async () => {
    fetchMock
      .mockRejectedValueOnce(timeoutError())
      .mockResolvedValueOnce(reply(500))
      .mockResolvedValueOnce(reply(200));
    const result = await service.sendToN8n({}, 'EVT', undefined, 3, 8000, {
      idempotent: true,
    });
    expect(result.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('always retries when the request never reached n8n', async () => {
    fetchMock.mockRejectedValueOnce(refused()).mockResolvedValueOnce(reply(200));
    expect((await service.sendToN8n({}, 'EVT')).success).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('reports an unreachable n8n as 502 after the last attempt', async () => {
    fetchMock.mockRejectedValue(refused());
    const result = await service.sendToN8n({}, 'EVT', undefined, 2);
    expect(result.statusCode).toBe(502);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('waits as long as Retry-After asks on HTTP 429', async () => {
    fetchMock
      .mockResolvedValueOnce(reply(429, {}, { 'retry-after': '3' }))
      .mockResolvedValueOnce(reply(200));
    await service.sendToN8n({}, 'EVT');
    expect(service.waits).toEqual([3000]);
  });

  it('stops retrying when the next wait would pass the deadline', async () => {
    fetchMock.mockResolvedValue(reply(429, {}, { 'retry-after': '30' }));
    const result = await service.sendToN8n({}, 'EVT', undefined, 3, 8000, {
      deadlineMs: 5000,
    });
    expect(result.statusCode).toBe(429);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(service.waits).toEqual([]);
  });

  it('never retries client errors such as 400', async () => {
    fetchMock.mockResolvedValue(reply(400, { error: 'bad' }));
    const result = await service.sendToN8n({}, 'EVT');
    expect(result).toEqual({ success: false, statusCode: 400, data: { error: 'bad' } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('uses the caller delivery id only when it is a safe header value', async () => {
    fetchMock.mockResolvedValue(reply(200));
    await service.sendToN8n({}, 'EVT', undefined, 0, 8000, { deliveryId: 'sync-123' });
    expect(headersOf(0)['X-Delivery-Id']).toBe('sync-123');
    await service.sendToN8n({}, 'EVT', undefined, 0, 8000, {
      deliveryId: 'bad\r\nX-Evil: 1',
    });
    expect(headersOf(1)['X-Delivery-Id']).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe('webhook helpers', () => {
  it('parses Retry-After seconds and HTTP dates', () => {
    expect(parseRetryAfter('2')).toBe(2000);
    expect(parseRetryAfter(null)).toBeNull();
    expect(parseRetryAfter('soon')).toBeNull();
    const now = Date.parse('2026-11-21T10:00:00Z');
    expect(parseRetryAfter('Sat, 21 Nov 2026 10:00:05 GMT', now)).toBe(5000);
  });

  it('accepts only short header-safe delivery ids', () => {
    expect(safeDeliveryId('academic-warning:22IT001:2026-11-21')).toBe(
      'academic-warning:22IT001:2026-11-21',
    );
    expect(safeDeliveryId('a b')).toBeUndefined();
    expect(safeDeliveryId('x'.repeat(201))).toBeUndefined();
    expect(safeDeliveryId(42)).toBeUndefined();
  });
});
