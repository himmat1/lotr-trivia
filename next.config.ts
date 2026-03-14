import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow long-running SSE connections without serverless timeout issues
  experimental: {
    // Ensure the Node.js EventEmitter-based session store works correctly
    // in development (works alongside globalThis pattern)
  },
};

export default nextConfig;
