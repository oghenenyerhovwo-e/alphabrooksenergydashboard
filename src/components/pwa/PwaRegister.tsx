"use client";

import { useEffect } from "react";

/**
 * Registers the PWA service worker (public/sw.js).
 *
 * Intentionally skipped when:
 *  - not a production build (avoids stale caches while developing)
 *  - running inside an iframe or the Teams client — i.e. the Teams tab
 *    version of the app never registers or uses the service worker
 *  - on /teams/* pages (the Teams sign-in popup completion page)
 */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const inIframe = window.self !== window.top;
    const inTeamsClient = /Teams\//i.test(navigator.userAgent);
    const onTeamsRoute = window.location.pathname.startsWith("/teams/");

    if (inIframe || inTeamsClient || onTeamsRoute) return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch((error) => {
        console.debug("[PWA] Service worker registration failed.", error);
      });
  }, []);

  return null;
}
