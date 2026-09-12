"use client";

import { useState } from "react";
import styles from "./LoginButton.module.css";
import Link from "next/link";

/**
 * Plain <a> to /api/auth/login, not a fetch/router.push — this has to work
 * as a real browser navigation because the endpoint issues a 302 redirect
 * to Microsoft. The onClick only changes the label/disabled look while
 * that navigation is in flight; it never intercepts the actual link.
 */
export function LoginButton() {
  const [isRedirecting, setIsRedirecting] = useState(false);

  return (
    <Link
      href="/api/auth/login"
      className={styles.button}
      aria-disabled={isRedirecting}
      onClick={(e) => {
        if (isRedirecting) {
          e.preventDefault();
          return;
        }
        setIsRedirecting(true);
      }}
    >
      <MicrosoftMark />
      {isRedirecting ? "Redirecting to Microsoft…" : "Sign in with Microsoft"}
    </Link>
  );
}

function MicrosoftMark() {
  return (
    <svg className={styles.msIcon} viewBox="0 0 21 21" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}