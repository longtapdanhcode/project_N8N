import {
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';

const SECRET = 'a'.repeat(40);
const payload = { type: 'INSERT', table: 'students', record: { id: 'SV1' } } as any;

function build(secret?: string) {
  const sync = { syncSupabaseStudent: jest.fn().mockResolvedValue({ success: true }) };
  const config = { get: () => secret } as unknown as ConfigService;
  return {
    sync,
    controller: new SyncController(sync as unknown as SyncService, config),
  };
}

describe('SyncController', () => {
  it('refuses every request when the secret is not configured', async () => {
    const { controller, sync } = build(undefined);
    await expect(
      controller.handleSupabaseStudentWebhook('vku_supabase_sync_secret_2026', payload),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(sync.syncSupabaseStudent).not.toHaveBeenCalled();
  });

  it('refuses a secret shorter than 32 characters', async () => {
    const { controller } = build('short');
    await expect(
      controller.handleSupabaseStudentWebhook('short', payload),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('rejects a wrong or missing header', async () => {
    const { controller } = build(SECRET);
    await expect(
      controller.handleSupabaseStudentWebhook('b'.repeat(40), payload),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      controller.handleSupabaseStudentWebhook(undefined as any, payload),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('syncs when the header matches', async () => {
    const { controller, sync } = build(SECRET);
    await controller.handleSupabaseStudentWebhook(SECRET, payload);
    expect(sync.syncSupabaseStudent).toHaveBeenCalledWith(payload);
  });
});
