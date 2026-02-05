const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // DO NOT set: output: "export"

  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@radix-ui/react-dialog": path.resolve(
        process.cwd(),
        "node_modules/@radix-ui/react-dialog"
      ),
    };
    return config;
  },
};

module.exports = nextConfig;
