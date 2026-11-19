import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PushService, parseSubscription } from './push.service';

const VAPID = {
  VAPID_PUBLIC_KEY: 'pub',
  VAPID_PRIVATE_KEY: 'priv',
  VAPID_SUBJECT: 'mailto:admin@example.com',
};
const sub = {
  endpoint: 'https://push.example.com/abc',
  keys: { p256dh: 'BPk3_key-1', auth: 'auth_2' },
};

function fakeModel(rows: any[] = []) {
  const calls: any[] = [];
  const q = (result: any) => ({ lean: () => q(result), exec: async () => result });
  return {
    calls,
    updateOne: (...args: any[]) => (calls.push(['updateOne', ...args]), q({})),
    deleteOne: (...args: any[]) => (calls.push(['deleteOne', ...args]), q({})),
    find: (...args: any[]) => (calls.push(['find', ...args]), q(rows)),
  };
}

const build = (config: Record<string, string> = VAPID, rows: any[] = [], sender = jest.fn()) => {
  const model = fakeModel(rows);
  const service = new PushService(
    model as any,
    { get: (k: string) => config[k] } as any,
    sender,
  );
  return { service, model, sender };
};

describe('parseSubscription', () => {
  it('accepts a browser subscription', () => {
    expect(parseSubscription(sub)).toEqual(sub);
  });
  it('rejects non-HTTPS endpoints and malformed keys', () => {
    expect(() => parseSubscription({ ...sub, endpoint: 'http://x' })).toThrow(BadRequestException);
    expect(() => parseSubscription({ ...sub, endpoint: 'not a url' })).toThrow(BadRequestException);
    expect(() => parseSubscription({ ...sub, keys: { p256dh: 'a b', auth: 'x' } })).toThrow(
      BadRequestException,
    );
    expect(() => parseSubscription({ endpoint: sub.endpoint })).toThrow(BadRequestException);
  });
});

describe('PushService', () => {
  it('is disabled without VAPID keys and never sends', async () => {
    const { service, sender } = build({});
    expect(service.enabled).toBe(false);
    expect(() => service.publicKey()).toThrow(ServiceUnavailableException);
    await expect(service.subscribe('23IT001', sub)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(await service.notifyStudent('23IT001', {} as any)).toEqual({ sent: 0, removed: 0 });
    expect(sender).not.toHaveBeenCalled();
  });

  it('upserts by endpoint so the device moves to the account that subscribed last', async () => {
    const { service, model } = build();
    await service.subscribe(' 23IT001 ', sub);
    expect(model.calls[0]).toEqual([
      'updateOne',
      { _id: sub.endpoint },
      { $set: { studentId: '23IT001', keys: sub.keys } },
      { upsert: true },
    ]);
  });

  it('only deletes a subscription owned by the student', async () => {
    const { service, model } = build();
    await service.unsubscribe('23IT001', sub.endpoint);
    expect(model.calls[0]).toEqual(['deleteOne', { _id: sub.endpoint, studentId: '23IT001' }]);
  });

  it('sends to every device and removes expired endpoints', async () => {
    const rows = [
      { _id: 'https://push.example.com/ok', keys: sub.keys },
      { _id: 'https://push.example.com/gone', keys: sub.keys },
      { _id: 'https://push.example.com/flaky', keys: sub.keys },
    ];
    const sender = jest.fn(async (s: any, _payload: string, _options: any) => {
      if (s.endpoint.endsWith('gone')) throw { statusCode: 410 };
      if (s.endpoint.endsWith('flaky')) throw { statusCode: 500 };
    });
    const { service, model } = build(VAPID, rows, sender);
    const message = { title: 'T', body: 'B', url: '/student/', tag: 't' };

    expect(await service.notifyStudent('23IT001', message)).toEqual({ sent: 1, removed: 1 });
    expect(sender).toHaveBeenCalledTimes(3);
    expect(JSON.parse(sender.mock.calls[0][1])).toEqual(message);
    expect(sender.mock.calls[0][2]).toMatchObject({
      vapidDetails: { publicKey: 'pub', privateKey: 'priv', subject: 'mailto:admin@example.com' },
    });
    expect(model.calls).toContainEqual(['deleteOne', { _id: 'https://push.example.com/gone' }]);
    expect(model.calls).not.toContainEqual(['deleteOne', { _id: 'https://push.example.com/flaky' }]);
  });
});
