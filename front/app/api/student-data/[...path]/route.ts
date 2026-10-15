import { NextRequest, NextResponse } from "next/server";
import { PassThrough } from "node:stream";
import type { IncomingMessage, ServerResponse } from "node:http";
import { mockApiPlugin, mockTimetable } from "../../../../../student-pwa/src/lib/mock";
import { COOKIE, readSession } from "@/lib/session";

type Middleware = (
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void,
) => void;

let middleware: Middleware;
const plugin = mockApiPlugin("/api/student-data");
const setup = plugin.configureServer;
if (typeof setup === "function") {
  setup.call(
    {} as never,
    {
      middlewares: {
        use(handler: Middleware) {
          middleware = handler;
        },
      },
    } as never,
  );
}

const BACKEND_URL = (
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:3001"
).replace(/\/$/, "");

async function handle(request: NextRequest) {
  const session = readSession(request.cookies.get(COOKIE)?.value);
  if (session?.role !== "student") {
    return NextResponse.json(
      { message: "Bạn cần đăng nhập bằng tài khoản sinh viên." },
      { status: 401 },
    );
  }

  const subPath = request.nextUrl.pathname.replace(/^\/api\/student-data\/?/, "");

  // Live backend proxy mode when mock is disabled
  if (process.env.NEXT_PUBLIC_PORTAL_MOCK !== "true") {
    // 1. Timetable fallback (backend doesn't have personal timetable API yet)
    if (subPath === "timetable") {
      return NextResponse.json(mockTimetable, {
        headers: { "Cache-Control": "no-store" },
      });
    }

    // 2. Grades/me fallback
    if (subPath === "grades/me") {
      try {
        const studentId = session.studentId || session.username;
        const res = await fetch(`${BACKEND_URL}/students/${encodeURIComponent(studentId)}`, {
          cache: "no-store",
        });
        if (res.ok) {
          const studentData = await res.json();
          if (Array.isArray(studentData.grades) && studentData.grades.length > 0) {
            return NextResponse.json(
              studentData.grades.map((g: any) => ({
                course: g.subject || g.course,
                credits: g.credits || 3,
                score: g.score || 0,
              })),
            );
          }
        }
      } catch (e) {
        console.warn("Could not load real grades, using default demo grades:", e);
      }
      return NextResponse.json([
        { course: "Lập trình Web", credits: 3, score: 8.5 },
        { course: "Cơ sở dữ liệu", credits: 3, score: 8.0 },
        { course: "Mạng máy tính", credits: 3, score: 7.8 },
      ]);
    }

    // 3. Proxy to Backend NestJS
    const targetUrl = `${BACKEND_URL}/${subPath}${request.nextUrl.search}`;
    const headers = new Headers();
    request.headers.forEach((val, key) => {
      const lower = key.toLowerCase();
      if (!["host", "content-length", "connection"].includes(lower)) {
        headers.set(key, val);
      }
    });

    const init: RequestInit = {
      method: request.method,
      headers,
      signal: AbortSignal.timeout(130_000),
    };

    if (["POST", "PUT", "PATCH"].includes(request.method)) {
      init.body = await request.text();
    }

    try {
      const backendRes = await fetch(targetUrl, init);
      const data = await backendRes.text();
      return new Response(data, {
        status: backendRes.status,
        headers: {
          "Content-Type": backendRes.headers.get("content-type") || "application/json",
          "Cache-Control": "no-store",
        },
      });
    } catch (err) {
      console.error(`Lỗi chuyển tiếp tới backend (${targetUrl}):`, err);
      return NextResponse.json(
        { message: "Không thể kết nối đến máy chủ backend." },
        { status: 502 },
      );
    }
  }

  // Fallback to mock middleware if NEXT_PUBLIC_PORTAL_MOCK === "true"
  const raw = await request.text();
  return new Promise<Response>((resolve) => {
    const incoming = new PassThrough() as unknown as IncomingMessage;
    incoming.url = request.nextUrl.pathname + request.nextUrl.search;
    incoming.method = request.method;
    incoming.headers = Object.fromEntries(request.headers.entries());
    const headers = new Headers({ "Cache-Control": "no-store" });
    const response = {
      statusCode: 200,
      setHeader(name: string, value: string) {
        headers.set(name, value);
      },
      end(body?: string) {
        resolve(new Response(body, { status: this.statusCode, headers }));
      },
    };
    middleware(incoming, response as unknown as ServerResponse, () =>
      resolve(
        NextResponse.json({ message: "Không tìm thấy API." }, { status: 404 }),
      ),
    );
    (incoming as unknown as PassThrough).end(raw);
  });
}

export {
  handle as GET,
  handle as POST,
  handle as PUT,
  handle as PATCH,
  handle as DELETE,
};
