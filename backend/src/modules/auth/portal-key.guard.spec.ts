import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PortalKeyGuard, portalKeyProblem, SkipPortalKey } from './portal-key.guard';

const KEY = 'k3y-'.padEnd(48, 'abcdefghijklmnop0123456789');

class Open {
  @SkipPortalKey()
  health() {}
  data() {}
}
@SkipPortalKey()
class Internal {
  callback() {}
}

function context(
  handler: () => void,
  cls: object,
  headers: Record<string, unknown> = {},
  type = 'http',
) {
  return {
    getType: () => type,
    getHandler: () => handler,
    getClass: () => cls,
    switchToHttp: () => ({ getRequest: () => ({ headers }) }),
  } as unknown as ExecutionContext;
}

function guard(key?: string) {
  const g = new PortalKeyGuard(
    { get: () => key } as never,
    new Reflector(),
  );
  g.onModuleInit();
  return g;
}

describe('PortalKeyGuard', () => {
  const data = Open.prototype.data;

  it('accepts only the exact portal key', () => {
    const g = guard(KEY);
    expect(g.canActivate(context(data, Open, { 'x-portal-key': KEY }))).toBe(true);
    for (const headers of [
      {},
      { 'x-portal-key': 'wrong' },
      { 'x-portal-key': KEY + 'x' },
      { 'x-portal-key': [KEY] },
    ])
      expect(() => g.canActivate(context(data, Open, headers))).toThrow(
        UnauthorizedException,
      );
  });

  it('skips routes and controllers marked as having their own auth', () => {
    const g = guard(KEY);
    expect(g.canActivate(context(Open.prototype.health, Open))).toBe(true);
    expect(g.canActivate(context(Internal.prototype.callback, Internal))).toBe(true);
  });

  it('lets everything through when no key is configured (local dev)', () => {
    expect(guard(undefined).canActivate(context(data, Open))).toBe(true);
  });

  it('refuses to start with a weak key', () => {
    expect(() => guard('short')).toThrow(/32/);
    expect(() => guard('a'.repeat(48))).toThrow(/dễ đoán/);
  });

  it('ignores non-HTTP contexts', () => {
    expect(guard(KEY).canActivate(context(data, Open, {}, 'rpc'))).toBe(true);
  });
});

describe('portalKeyProblem', () => {
  it('accepts a random key and an unset key', () => {
    expect(portalKeyProblem(KEY)).toBeNull();
    expect(portalKeyProblem(undefined)).toBeNull();
  });
});
