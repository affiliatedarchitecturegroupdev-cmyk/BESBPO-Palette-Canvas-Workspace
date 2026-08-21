/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Browser-side calls go to same-origin /pc-api and are proxied to the API,
  // so hosted tunnels need no CORS and no second exposed port.
  async rewrites() {
    return [
      {
        source: '/pc-api/:path*',
        destination: `${process.env.PC_API_URL ?? 'http://localhost:3001'}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
