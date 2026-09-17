"use client";

import { useState } from "react";
import styles from "./LoginButton.module.css";
import { app, authentication } from "@microsoft/teams-js";

export function LoginButton() {
  const [isRedirecting, setIsRedirecting] = useState(false);

  async function handleLogin() {
    if (isRedirecting) return;

    setIsRedirecting(true);

    try {
      let isTeams = false;

      try {
        await app.initialize();
        isTeams = true;
      } catch {
        isTeams = false;
      }

      if (!isTeams) {
        window.location.href = "/api/auth/login";
        return;
      }

      const result = await authentication.authenticate({
        url: `${window.location.origin}/api/auth/login`,
        width: 600,
        height: 700,
      });

      console.log("[Teams] Authentication completed.", result);

      window.location.reload();
    } catch (error) {
      console.error("[Teams] Authentication failed:", error);
      setIsRedirecting(false);
    }
  }

  return (
    <button
      type="button"
      className={styles.button}
      disabled={isRedirecting}
      onClick={handleLogin}
    >
      <MicrosoftMark />
      {isRedirecting
        ? "Signing in…"
        : "Sign in with Microsoft"}
    </button>
  );
}

function MicrosoftMark() {
  return (
    <svg
      className={styles.msIcon}
      viewBox="0 0 21 21"
      aria-hidden="true"
    >
      <rect
        x="1"
        y="1"
        width="9"
        height="9"
        fill="#f25022"
      />
      <rect
        x="11"
        y="1"
        width="9"
        height="9"
        fill="#7fba00"
      />
      <rect
        x="1"
        y="11"
        width="9"
        height="9"
        fill="#00a4ef"
      />
      <rect
        x="11"
        y="11"
        width="9"
        height="9"
        fill="#ffb900"
      />
    </svg>
  );
}