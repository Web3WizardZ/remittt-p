import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack(config) {
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

export default nextConfig;
