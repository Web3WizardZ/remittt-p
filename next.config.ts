import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,

  // Add security headers that allow popup-based authentication flows
  // This fixes: "Cross-Origin-Opener-Policy policy would block the window.closed call"
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            // Use 'same-origin-allow-popups' instead of 'same-origin' to allow
            // communication with popup windows (required for OAuth flows like Google)
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
      },
    ];
  },
};

export default nextConfig;