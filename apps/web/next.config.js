/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@ws-flows/shared'],
  // Enable standalone output for Docker deployment
  output: 'standalone',
};

module.exports = nextConfig;
