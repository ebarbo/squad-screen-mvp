import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Provider credentials are server-only. Nothing here may be prefixed NEXT_PUBLIC_.
  serverExternalPackages: ['openai'],
};

export default nextConfig;
