"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Builds the web app manifest in memory for the page the user is on,
 * so "Install" packages the app to open THIS page.
 * src/app/manifest.ts stays in place as the fallback.
 */
export function DynamicManifest() {
  const pathname = usePathname(); // re-runs on every client-side navigation

  useEffect(() => {
    // Same guards as PwaRegister: never touch the Teams versions.
    const inIframe = window.self !== window.top;
    const inTeamsClient = /Teams\//i.test(navigator.userAgent);
    if (inIframe || inTeamsClient || pathname.startsWith("/teams/")) return;

    const origin = window.location.origin;

    // Never make the login page the app's home.
    const startPath = pathname === "/login" ? "/" : pathname;

    const manifest = {
      // Unique id per page = each page can be installed as its own app.
      id: origin + startPath,
      name: "Alpha Brooks Energy — Operations Platform",
      short_name: "Alpha Brooks",
      description: "Alpha Brooks Energy master operations command centre",
      start_url: origin + startPath, // <-- the whole point
      scope: origin + "/",
      display: "standalone",
      orientation: "any",
      background_color: "#f5f6f1",
      theme_color: "#12190f",
      categories: ["business", "productivity"],
      // Must be ABSOLUTE: a blob: manifest can't resolve relative paths.
      icons: [
        { src: origin + "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: origin + "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: origin + "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
      shortcuts: [
        { name: "Overview", url: origin + "/" },
        { name: "CNG Operations", url: origin + "/cng" },
        { name: "Main Operations", url: origin + "/operations" },
        { name: "Commercial", url: origin + "/commercial" },
      ],
    };

    const blob = new Blob([JSON.stringify(manifest)], {
      type: "application/manifest+json",
    });
    const blobUrl = URL.createObjectURL(blob);

    // Point Chrome at the temporary manifest instead of the static one.
    let link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "manifest";
      document.head.appendChild(link);
    }
    link.href = blobUrl;

    return () => URL.revokeObjectURL(blobUrl);
  }, [pathname]);

  return null;
}