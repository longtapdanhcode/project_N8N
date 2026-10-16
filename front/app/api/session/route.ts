import { NextRequest, NextResponse } from "next/server";
import {
  COOKIE,
  destination,
  readSession,
  signSession,
  type Role,
  type Session,
} from "@/lib/session";

import { BACKEND_URL } from "@/lib/backend";

function sameOrigin(req: NextRequest) {
  const originHeader = req.headers.get("origin");
  if (!originHeader) {
    // Cho phép gọi trực tiếp qua curl / API client không có header origin
    return true;
  }
  try {
    const origin = new URL(originHeader);
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
  if (!sameOrigin(req)) {
    return NextResponse.json(
      { message: "Nguồn yêu cầu không hợp lệ." },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => null);
  const identifier =
    typeof body?.username === "string"
      ? body.username.trim()
      : typeof body?.identifier === "string"
        ? body.identifier.trim()
        : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!identifier || !password) {
    return NextResponse.json(
      { message: "Vui lòng nhập tài khoản/email và mật khẩu." },
      { status: 400 },
    );
  }

  try {
    // Chuyển tiếp request xác thực sang Backend NestJS cổng 3001
    const backendRes = await fetch(`${BACKEND_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: identifier,
        password,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });

    const backendData = await backendRes.json().catch(() => ({}));

    if (!backendRes.ok || !backendData?.success || !backendData?.user) {
      return NextResponse.json(
        {
          message:
            backendData?.message || "Tài khoản hoặc mật khẩu không chính xác.",
        },
        { status: backendRes.ok ? 502 : backendRes.status },
      );
    }

    const user = backendData.user;
    const backendRole = String(user.role).toUpperCase();
    if (!["STUDENT", "TEACHER", "ADMIN"].includes(backendRole)) {
      return NextResponse.json(
        { message: "Vai trò tài khoản không hợp lệ." },
        { status: 403 },
      );
    }
    const normalizedRole: Role =
      backendRole === "STUDENT" ? "student" : "teacher";

    const session: Session = {
      username: user.username || identifier,
      name: user.name || user.fullName || "Người dùng",
      role: normalizedRole,
      studentId:
        user.studentId ||
        (normalizedRole === "student" ? user.username : undefined),
      email: user.email,
      department: user.department,
      expires: Date.now() + 8 * 60 * 60 * 1000,
    };

    const response = NextResponse.json({
      success: true,
      destination: destination(normalizedRole),
      accessToken: backendData.accessToken,
      session: {
        username: session.username,
        name: session.name,
        role: session.role,
        studentId: session.studentId,
        email: session.email,
        department: session.department,
      },
    });

    response.cookies.set(COOKIE, signSession(session), {
      httpOnly: true,
      sameSite: "lax",
      secure: new URL(req.url).protocol === "https:",
      path: "/",
      maxAge: 8 * 60 * 60,
    });

    return response;
  } catch (err: unknown) {
    return NextResponse.json(
      {
        message:
          "Không thể kết nối đến máy chủ xác thực Backend (cổng 3001). Vui lòng thử lại sau.",
      },
      { status: 503 },
    );
  }
}

export function DELETE(req: NextRequest) {
  if (!sameOrigin(req)) {
    return NextResponse.json(
      { message: "Nguồn yêu cầu không hợp lệ." },
      { status: 403 },
    );
  }
  const response = NextResponse.json({ success: true });
  response.cookies.set(COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
