import { NextRequest, NextResponse } from "next/server";
import { COOKIE, readSession } from "@/lib/session";
import { proxyBackend } from "@/lib/backend";

// Teacher browser calls go through here so the backend never has to be public.
const allowedRead = [
  /^students$/,
  /^students\/(classes|top-violators|kpis)$/,
  /^students\/[^/]+$/,
  /^dashboard\/kpis$/,
  /^attendance\/(records|history)$/,
  /^theses$/,
  /^courses$/,
  /^class-sections$/,
  /^documents$/,
];
const allowedWrite: Record<string, RegExp[]> = {
  POST: [
    /^documents\/ingest-(text|file)$/,
    /^academic-warning\/scan$/,
  ],
  PATCH: [/^theses\/[^/]+\/milestones\/[^/]+$/],
};

async function handle(request: NextRequest) {
  const session = readSession(request.cookies.get(COOKIE)?.value);
  if (session?.role !== "teacher")
    return NextResponse.json(
      { message: "Cần đăng nhập giảng viên." },
      { status: 401 },
    );
  const subPath = request.nextUrl.pathname.replace(
    /^\/api\/teacher-data\/?/,
    "",
  );
  const rules =
    request.method === "GET" ? allowedRead : allowedWrite[request.method];
  if (!rules?.some((rule) => rule.test(subPath)))
    return NextResponse.json(
      { message: "Không tìm thấy API giảng viên." },
      { status: 404 },
    );
  const headers = new Headers();
  let body: ArrayBuffer | undefined;
  if (request.method !== "GET") {
    // Forward the raw body so multipart uploads keep their boundary.
    const contentType = request.headers.get("content-type");
    if (contentType) headers.set("Content-Type", contentType);
    body = await request.arrayBuffer();
  }
  return proxyBackend(`/${subPath}${request.nextUrl.search}`, {
    method: request.method,
    headers,
    ...(body === undefined ? {} : { body }),
  });
}
export { handle as GET, handle as POST, handle as PATCH };
