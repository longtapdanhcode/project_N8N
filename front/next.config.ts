import type { NextConfig } from "next";
import path from "node:path";

const cspHeader = `
  default-src 'self' http: https: data: blob:;
  script-src 'self' 'unsafe-eval' 'unsafe-inline' https: http:;
  style-src 'self' 'unsafe-inline' https: http:;
  img-src 'self' blob: data: https: http:;
  font-src 'self' data: https: http:;
  connect-src 'self' https: http: ws: wss:;
  frame-ancestors 'none';
`.replace(/\s{2,}/g, ' ').trim();

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
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:3001/:path*',
      },
      {
        source: '/student/api/:path*',
        destination: 'http://127.0.0.1:3001/:path*',
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
        destination: 'http://127.0.0.1:3001/class-sections',
      },
      {
        source: '/student/courses',
        destination: 'http://127.0.0.1:3001/courses',
      },
      {
        source: '/student/attendance/:path*',
        destination: 'http://127.0.0.1:3001/attendance/:path*',
      },
      {
        source: '/student/theses/:path*',
        destination: 'http://127.0.0.1:3001/theses/:path*',
      },
      {
        source: '/student/theses',
        destination: 'http://127.0.0.1:3001/theses',
      },
    ];
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
