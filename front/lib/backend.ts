export const BACKEND_URL = (
  process.env.BACKEND_INTERNAL_URL ||
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://127.0.0.1:3001"
).replace(/\/$/, "");

/**
 * Gắn khóa cổng (PORTAL_API_KEY) để backend biết request đến từ cổng 3000.
 * Chỉ chạy ở máy chủ: biến này không có tiền tố NEXT_PUBLIC nên không vào bản trình duyệt.
 */
export function withPortalKey(init: RequestInit = {}): RequestInit {
  const key = typeof window === "undefined" ? process.env.PORTAL_API_KEY?.trim() : undefined;
  // Không có khóa thì giữ nguyên init (ví dụ để trình duyệt tự đặt boundary multipart).
  if (!key) return init;
  const headers = new Headers(init.headers);
  headers.set("x-portal-key", key);
  return { ...init, headers };
}

/** fetch tới backend kèm khóa cổng. */
export function backendFetch(path: string, init: RequestInit = {}) {
  return fetch(`${BACKEND_URL}${path}`, withPortalKey(init));
}

// Do not forward browser cookies or internal credentials to the backend.
export async function proxyBackend(path: string, init: RequestInit = {}) {
  try {
    const response = await backendFetch(path, {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(130_000),
    });
    const body = await response.text();
    return new Response(
      [204, 205, 304].includes(response.status) ? null : body,
      {
        status: response.status,
        headers: {
          "Content-Type":
            response.headers.get("content-type") || "application/json",
          "Cache-Control": "no-store",
        },
      },
    );
  } catch {
    return Response.json(
      { message: "Không thể kết nối đến máy chủ backend. Vui lòng thử lại." },
      { status: 502 },
    );
  }
}
