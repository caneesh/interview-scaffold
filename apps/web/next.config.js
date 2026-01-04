/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@scaffold/core',
    '@scaffold/contracts',
    '@scaffold/adapter-db',
    '@scaffold/adapter-auth',
    '@scaffold/adapter-analytics',
  ],
};

module.exports = nextConfig;
