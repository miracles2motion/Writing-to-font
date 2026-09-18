/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["@google/genai", "opentype.js"],
};

export default nextConfig;
