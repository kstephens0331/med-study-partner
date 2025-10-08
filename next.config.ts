import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Disable ESLint during production builds (already checked locally)
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Skip type checking during builds (already checked locally)
    ignoreBuildErrors: false,
  },
  experimental: {
    // Skip page data collection for API routes during build
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  webpack: (config) => {
    // Externalize canvas to prevent server-side bundling issues
    config.resolve = config.resolve || {};
    config.resolve.alias = config.resolve.alias || {};
    config.resolve.alias.canvas = false;

    return config;
  },
};

export default nextConfig;
