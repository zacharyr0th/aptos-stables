/** @type {import('next').NextConfig} */
const nextConfig = {
  serverComponentsExternalPackages: [],
  // Default port is 3000, we need to change it to 3001
  experimental: {},
  transpilePackages: ["geist"]
};

export default nextConfig;
