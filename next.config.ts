import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  ...(!process.env.VERCEL ? { output: "standalone" as const } : {}),
  poweredByHeader: false,
  headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(self)" },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
          },
        ],
      },
    ];
  },
  serverExternalPackages: ["unpdf"],
  outputFileTracingIncludes: {
    "/api/interviews/*/pdf": ["./assets/fonts/**/*"],
    "/api/resume": ["./scripts/pdf-worker.mjs", "./node_modules/unpdf/**/*"],
  },
  devIndicators: false,
  webpack(config, { dev }) {
    if (dev)
      config.watchOptions = {
        ...config.watchOptions,
        poll: 1000,
        aggregateTimeout: 300,
      };
    return config;
  },
};
export default nextConfig;
