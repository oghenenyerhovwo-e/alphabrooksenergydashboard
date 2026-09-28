import type { MetadataRoute } from "next";

/**
 * Web App Manifest — served by Next.js at /manifest.webmanifest.
 *
 * This is what lets Chrome/Edge offer "Install Alpha Brooks Energy".
 * It is completely separate from the Microsoft Teams app manifest
 * (the Teams app package you uploaded to the Teams admin centre), so
 * changing this file has no effect on the Teams version of the app.
 *
 * NOTE: /manifest.webmanifest must stay reachable WITHOUT a session
 * cookie (Chrome fetches it without credentials). That is why it is
 * excluded in the matcher in src/proxy.ts.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Alpha Brooks Energy — Operations Platform",
    short_name: "Alpha Brooks",
    description: "Alpha Brooks Energy master operations command centre",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#f5f6f1",
    theme_color: "#12190f",
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    // Right-click / long-press jump list on the installed app icon.
    shortcuts: [
      { name: "Overview", url: "/" },
      { name: "CNG Operations", url: "/cng" },
      { name: "Main Operations", url: "/operations" },
      { name: "Commercial", url: "/commercial" },
    ],
  };
}
