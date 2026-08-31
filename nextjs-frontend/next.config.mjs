/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  outputFileTracingRoot: process.cwd(),
  async rewrites() {
    const backend = process.env.BACKEND_URL || 'http://127.0.0.1:8000';
    return [
      { source: '/api/:path*', destination: `${backend}/api/:path*` },
      { source: '/static/:path*', destination: `${backend}/static/:path*` },
    ];
  },
};

export default nextConfig;
