// Giới hạn tần suất trong bộ nhớ của tiến trình Next (cửa sổ trượt).
// Đủ cho một máy chủ cổng 3000; chạy nhiều bản sau cân bằng tải thì mỗi bản
// đếm riêng, khi đó cần chuyển sang kho chung như Redis.

export interface Rule {
  limit: number;
  windowMs: number;
}

const MAX_KEYS = 10_000;

export class RateLimiter {
  private readonly hits = new Map<string, number[]>();
  private readonly now: () => number;

  constructor(now: () => number = Date.now) {
    this.now = now;
  }

  private recent(key: string, windowMs: number) {
    const since = this.now() - windowMs;
    return (this.hits.get(key) ?? []).filter((t) => t > since);
  }

  /** Số giây phải chờ nếu khóa đã chạm giới hạn của một quy tắc, ngược lại 0. */
  retryAfter(key: string, rules: Rule[]) {
    let wait = 0;
    for (const rule of rules) {
      const times = this.recent(key, rule.windowMs);
      if (times.length >= rule.limit) {
        const freeAt = times[times.length - rule.limit] + rule.windowMs;
        wait = Math.max(wait, Math.ceil((freeAt - this.now()) / 1000));
      }
    }
    return Math.max(wait, wait > 0 ? 1 : 0);
  }

  record(key: string, rules: Rule[]) {
    const longest = Math.max(...rules.map((r) => r.windowMs));
    const times = this.recent(key, longest);
    times.push(this.now());
    // Map giữ thứ tự chèn: xóa rồi chèn lại để khóa mới dùng nằm cuối.
    this.hits.delete(key);
    this.hits.set(key, times);
    while (this.hits.size > MAX_KEYS)
      this.hits.delete(this.hits.keys().next().value!);
  }

  /** Kiểm tra rồi ghi nhận một lượt; trả số giây phải chờ khi bị chặn. */
  consume(key: string, rules: Rule[]) {
    const wait = this.retryAfter(key, rules);
    if (!wait) this.record(key, rules);
    return wait;
  }

  reset(key: string) {
    this.hits.delete(key);
  }
}

const minute = 60_000;

export const RULES = {
  /** Đăng nhập sai theo tài khoản: chặn dò mật khẩu một tài khoản. */
  loginAccount: [{ limit: 5, windowMs: 15 * minute }],
  /** Đăng nhập sai theo IP (chỉ khi tin header của reverse proxy). */
  loginIp: [{ limit: 30, windowMs: 15 * minute }],
  /** Hỏi đáp AI theo người dùng. */
  askUser: [
    { limit: 6, windowMs: minute },
    { limit: 60, windowMs: 60 * minute },
  ],
  /** Tổng số câu hỏi AI cả cổng, giữ hạn mức Gemini. */
  askGlobal: [{ limit: 120, windowMs: minute }],
  /** Nạp tài liệu (mỗi tệp tạo nhiều embedding). */
  ingestUser: [{ limit: 20, windowMs: 60 * minute }],
} satisfies Record<string, Rule[]>;

// Giữ một bộ đếm khi Next nạp lại module trong lúc dev.
const store = globalThis as typeof globalThis & { __vkuRateLimiter?: RateLimiter };
export const limiter = (store.__vkuRateLimiter ??= new RateLimiter());

/**
 * IP người dùng, chỉ khi cổng chạy sau reverse proxy đáng tin (TRUST_PROXY=true).
 * Không thì header này do trình duyệt tự đặt được, nên bỏ qua.
 */
export function clientIp(headers: Headers) {
  if (process.env.TRUST_PROXY !== "true") return null;
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || null;
}

export function tooManyRequests(retryAfter: number, message: string) {
  return Response.json(
    { message, retryAfter },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfter), "Cache-Control": "no-store" },
    },
  );
}

const waitText = (seconds: number) =>
  seconds < 60 ? `${seconds} giây` : `${Math.ceil(seconds / 60)} phút`;

/**
 * Chặn câu hỏi AI vượt giới hạn của người dùng hoặc của cả cổng.
 * Trả Response 429 khi bị chặn, null khi được phép (và đã ghi nhận lượt hỏi).
 */
export function limitAsk(userKey: string) {
  const user = limiter.retryAfter(`ask:${userKey}`, RULES.askUser);
  if (user)
    return tooManyRequests(
      user,
      `Bạn hỏi hơi nhanh. Vui lòng thử lại sau ${waitText(user)}.`,
    );
  const global = limiter.retryAfter("ask:*", RULES.askGlobal);
  if (global)
    return tooManyRequests(
      global,
      `Trợ lý AI đang nhận nhiều câu hỏi. Vui lòng thử lại sau ${waitText(global)}.`,
    );
  limiter.record(`ask:${userKey}`, RULES.askUser);
  limiter.record("ask:*", RULES.askGlobal);
  return null;
}

export { waitText };
