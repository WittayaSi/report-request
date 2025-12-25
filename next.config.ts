import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
];

const nextConfig: NextConfig = {
  // Allow larger file uploads for Server Actions (default is 1MB)
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  webpack: (config) => {
    // บอก Webpack ไม่ต้องสนใจ pg-native
    config.externals.push({
      "pg-native": "pg-native",
    });
    return config;
  },
  // Turbopack config for Next.js 16+
  turbopack: {
    resolveAlias: {
      "pg-native": "pg-native",
    },
  },
  async headers() {
    return [
      {
        // Apply headers to all routes
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;

