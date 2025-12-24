import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow larger file uploads for Server Actions (default is 1MB)
  serverActions: {
    bodySizeLimit: "10mb",
  },
  webpack: (config) => {
    // บอก Webpack ไม่ต้องสนใจ pg-native
    config.externals.push({
      "pg-native": "pg-native",
    });
    return config;
  },
};

export default nextConfig;
