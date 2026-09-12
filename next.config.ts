import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,

  async headers() {
    return [
      {
        // Baseline hardening headers, applied to every route. None of
        // these change existing behavior — they only switch off browser
        // capabilities the app doesn't use (framing, camera, mic,
        // geolocation, MIME-sniffing). A real Content-Security-Policy is
        // deliberately deferred — see the 2.10 subphase report.
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
    ];
  },
};

export default nextConfig;