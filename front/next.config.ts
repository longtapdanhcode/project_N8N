import type { NextConfig } from "next";
import path from "node:path";

const cspHeader = `
  default-src 'self' http: https: data: blob:;
  script-src 'self' 'unsafe-eval' 'unsafe-inline' https: http:;
  style-src 'self' 'unsafe-inline' https: http:;
  img-src 'self' blob: data: https: http:;
  font-src 'self' data: https: http:;
  media-src 'self' https: http: blob: data:;
  connect-src 'self' https: http: ws: wss:;
  frame-ancestors 'none';
`.replace(/\s{2,}/g, ' ').trim();

const backendUrl = (process.env.BACKEND_INTERNAL_URL || process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:3001").replace(/\/$/, "");

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/student',
        destination: '/student/index.html',
        permanent: false,
      },
    ];
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader,
          },
        ],
      },
      {
        source: '/student/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
        ],
      },
    ];
  },

  async rewrites() {
    // Keep app API handlers ahead of the generic backend proxy.
    const fallback = [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/:path*`,
      },
      {
        source: '/student/api/:path*',
        destination: `${backendUrl}/:path*`,
      },
      // Fallback rewrites in case relative URLs are requested from /student/index.html
      {
        source: '/student/timetable',
        destination: '/api/timetable',
      },
      {
        source: '/student/me',
        destination: '/api/me',
      },
      {
        source: '/student/grades/:path*',
        destination: '/api/grades/:path*',
      },
      {
        source: '/student/class-sections',
        destination: `${backendUrl}/class-sections`,
      },
      {
        source: '/student/courses',
        destination: `${backendUrl}/courses`,
      },
      {
        source: '/student/attendance/:path*',
        destination: `${backendUrl}/attendance/:path*`,
      },
      {
        source: '/student/theses/:path*',
        destination: `${backendUrl}/theses/:path*`,
      },
      {
        source: '/student/theses',
        destination: `${backendUrl}/theses`,
      },
    ];
    return { fallback };
  },

  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    root: path.resolve(process.cwd(), '..'),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
