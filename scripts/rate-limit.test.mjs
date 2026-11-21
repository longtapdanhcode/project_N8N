import { test } from "node:test";
import assert from "node:assert/strict";
import { RateLimiter, clientIp } from "../front/lib/rate-limit.ts";

function clock(start = 1_000_000) {
  const c = { t: start, now: () => c.t };
  return c;
}

test("blocks after the limit and reopens as the window slides", () => {
  const c = clock();
  const limiter = new RateLimiter(c.now);
  const rules = [{ limit: 3, windowMs: 60_000 }];
  for (let i = 0; i < 3; i++) {
    assert.equal(limiter.consume("u", rules), 0);
    c.t += 10_000;
  }
  // Lượt đầu ở t=0, giờ là t=30s: còn 30 giây.
  assert.equal(limiter.consume("u", rules), 30);
  assert.equal(limiter.consume("other", rules), 0, "keys are independent");
  c.t += 30_000;
  assert.equal(limiter.consume("u", rules), 0);
});

test("applies the strictest of several rules", () => {
  const c = clock();
  const limiter = new RateLimiter(c.now);
  const rules = [
    { limit: 2, windowMs: 60_000 },
    { limit: 3, windowMs: 3_600_000 },
  ];
  limiter.consume("u", rules);
  limiter.consume("u", rules);
  assert.ok(limiter.consume("u", rules) > 0, "per-minute cap");
  c.t += 61_000;
  assert.equal(limiter.consume("u", rules), 0);
  c.t += 61_000;
  const wait = limiter.consume("u", rules);
  assert.ok(wait > 3000, `per-hour cap, got ${wait}s`);
});

test("blocked attempts are not counted; reset clears a key", () => {
  const c = clock();
  const limiter = new RateLimiter(c.now);
  const rules = [{ limit: 1, windowMs: 60_000 }];
  limiter.consume("u", rules);
  for (let i = 0; i < 5; i++) limiter.consume("u", rules);
  c.t += 60_001;
  assert.equal(limiter.consume("u", rules), 0);
  limiter.reset("u");
  assert.equal(limiter.retryAfter("u", rules), 0);
});

test("never reports less than one second while blocked", () => {
  const c = clock();
  const limiter = new RateLimiter(c.now);
  const rules = [{ limit: 1, windowMs: 1000 }];
  limiter.consume("u", rules);
  c.t += 999;
  assert.equal(limiter.retryAfter("u", rules), 1);
});

test("trusts forwarded IP headers only behind a configured proxy", () => {
  const headers = new Headers({ "x-forwarded-for": "203.0.113.9, 10.0.0.1" });
  const previous = process.env.TRUST_PROXY;
  try {
    delete process.env.TRUST_PROXY;
    assert.equal(clientIp(headers), null);
    process.env.TRUST_PROXY = "true";
    assert.equal(clientIp(headers), "203.0.113.9");
    assert.equal(clientIp(new Headers({ "x-real-ip": "198.51.100.2" })), "198.51.100.2");
  } finally {
    if (previous === undefined) delete process.env.TRUST_PROXY;
    else process.env.TRUST_PROXY = previous;
  }
});
