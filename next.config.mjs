/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
