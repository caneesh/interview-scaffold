/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@learning/core',
    '@learning/contracts',
    '@learning/adapter-db',
    '@learning/adapter-auth',
    '@learning/adapter-llm',
    '@learning/adapter-analytics',
  ],
};

module.exports = nextConfig;
