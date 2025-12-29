import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Increase header size limit to handle OAuth callbacks
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Increase header size limit
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
