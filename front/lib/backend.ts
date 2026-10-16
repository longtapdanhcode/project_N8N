export const BACKEND_URL = (
  process.env.BACKEND_INTERNAL_URL ||
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://127.0.0.1:3001"
).replace(/\/$/, "");

// Do not forward browser cookies or internal credentials to the backend.
export async function proxyBackend(path: string, init: RequestInit = {}) {
  try {
    const response = await fetch(`${BACKEND_URL}${path}`, {
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
