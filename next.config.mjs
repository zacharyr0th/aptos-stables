/** @type {import('next').NextConfig} */
const nextConfig = {
  serverComponentsExternalPackages: [],
  // Default port is 3000, we need to change it to 3001
  experimental: {},
  transpilePackages: ["geist"],
  // Optimize for Vercel deployment
  poweredByHeader: false,
  reactStrictMode: true,
  swcMinify: true,
  // Add output settings for standalone mode (better performance)
  output: 'standalone',
};

export default nextConfig;
