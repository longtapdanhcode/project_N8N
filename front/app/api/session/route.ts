import { NextRequest, NextResponse } from "next/server";
import {
  accounts,
  COOKIE,
  destination,
  readSession,
  signSession,
} from "@/lib/session";
function sameOrigin(req: NextRequest) {
  try {
    const origin = new URL(req.headers.get("origin") || "");
    return (
      ["http:", "https:"].includes(origin.protocol) &&
      origin.host === req.headers.get("host")
    );
  } catch {
    return false;
  }
}

export function GET(req: NextRequest) {
  const session = readSession(req.cookies.get(COOKIE)?.value);
  return NextResponse.json(
    session ? { session } : { message: "Chưa đăng nhập." },
    { status: session ? 200 : 401, headers: { "Cache-Control": "no-store" } },
  );
}
export async function POST(req: NextRequest) {
  if (!sameOrigin(req))
    return NextResponse.json(
      { message: "Nguồn yêu cầu không hợp lệ." },
      { status: 403 },
    );
  if (process.env.DEMO_AUTH_ENABLED !== "true")
    return NextResponse.json(
      { message: "Chưa cấu hình dịch vụ đăng nhập thật." },
      { status: 503 },
    );
  const body = await req.json().catch(() => null);
  const account =
    typeof body?.username === "string" && typeof body?.password === "string"
      ? accounts.find(
          (a) =>
            a.username === body.username.trim() && a.password === body.password,
        )
      : undefined;
  if (!account)
    return NextResponse.json(
      { message: "Tài khoản hoặc mật khẩu không đúng." },
      { status: 401 },
    );
  try {
    const session = {
      username: account.username,
      name: account.name,
      role: account.role,
      expires: Date.now() + 8 * 60 * 60 * 1000,
    };
    const response = NextResponse.json({
      destination: destination(account.role),
    });
    response.cookies.set(COOKIE, signSession(session), {
      httpOnly: true,
      sameSite: "lax",
      secure: new URL(req.url).protocol === "https:",
      path: "/",
      maxAge: 8 * 60 * 60,
    });
    return response;
  } catch {
    return NextResponse.json(
      {
        message:
          "Chưa cấu hình phiên đăng nhập. Chạy ứng dụng bằng lệnh ở thư mục gốc.",
      },
      { status: 503 },
    );
  }
}
export function DELETE(req: NextRequest) {
  if (!sameOrigin(req))
    return NextResponse.json(
      { message: "Nguồn yêu cầu không hợp lệ." },
      { status: 403 },
    );
  const response = NextResponse.json({ success: true });
  response.cookies.set(COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
