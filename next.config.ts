// next.config.ts
export default {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
          // If you had COEP too, consider removing it unless you truly need it
        ],
      },
    ];
  },
};
