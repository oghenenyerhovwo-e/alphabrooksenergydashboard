"use client";

import { useEffect, useState } from "react";
import styles from "./InstallAppButton.module.css";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * "Install app" button.
 *
 * Chrome/Edge only fire `beforeinstallprompt` when the app is installable
 * AND not already installed AND not inside an iframe — so this renders
 * nothing in the installed app, and nothing inside Microsoft Teams.
 * (Chrome's own install icon in the address bar keeps working either way.)
 */
export function InstallAppButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null
  );

  useEffect(() => {
    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    }

    function onInstalled() {
      setDeferred(null);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!deferred) return null;

  async function handleInstall() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    // The event can only be used once.
    setDeferred(null);
  }

  return (
    <button type="button" className={styles.button} onClick={handleInstall}>
      Install app
    </button>
  );
}
