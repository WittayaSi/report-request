import type { NextConfig } from "next";

/**
 * Next.js Config สำหรับ Docker Build
 * ใช้ output: 'standalone' เพื่อสร้าง minimal production build
 */

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
  output: 'standalone', // Required for Docker
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  webpack: (config) => {
    config.externals.push({
      "pg-native": "pg-native",
    });
    return config;
  },
  turbopack: {
    resolveAlias: {
      "pg-native": "pg-native",
    },
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
