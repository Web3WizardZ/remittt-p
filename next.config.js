/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // DO NOT set output: "export"
  // Helpful for debugging runtime errors:
  productionBrowserSourceMaps: true,
};

module.exports = nextConfig;
