import { NextRequest, NextResponse } from "next/server";
import { PassThrough } from "node:stream";
import type { IncomingMessage, ServerResponse } from "node:http";
import { mockApiPlugin } from "../../../../../student-pwa/src/lib/mock";
import { COOKIE, readSession } from "@/lib/session";
type Middleware = (
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void,
) => void;

let middleware: Middleware;
const plugin = mockApiPlugin("/api/student-data");
const setup = plugin.configureServer;
if (typeof setup === "function")
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

async function handle(request: NextRequest) {
  const session = readSession(request.cookies.get(COOKIE)?.value);
  if (session?.role !== "student")
    return NextResponse.json(
      { message: "Bạn cần đăng nhập bằng tài khoản sinh viên." },
      { status: 401 },
    );
  if (process.env.NEXT_PUBLIC_PORTAL_MOCK !== "true")
    return NextResponse.json(
      { message: "Chưa nối API sinh viên cho chế độ này." },
      { status: 503 },
    );
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
export { handle as GET, handle as POST, handle as PUT };
