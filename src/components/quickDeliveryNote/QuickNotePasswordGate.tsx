"use client";

import { useState } from "react";
import styles from "./QuickNotePasswordGate.module.css";

export function QuickNotePasswordGate() {
  
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/quick-delivery-note/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        setError(data?.error ?? "Incorrect password.");
        setSubmitting(false);
        return;
      }
      window.location.assign("/quick-delivery-note");
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.screen}>
      <div className={styles.glow} aria-hidden="true" />

      <form className={styles.card} onSubmit={handleSubmit}>
        <div className={styles.mark}>AB</div>
        <div className={styles.brand}>Alpha Brooks Energy</div>
        <h1 className={styles.title}>Quick Delivery Note</h1>
        <p className={styles.subtitle}>
          A temporary, standalone tool for signing off a delivery on site.
          Enter the access code to continue.
        </p>

        <label className={styles.label} htmlFor="qdn-password">
          Access code
        </label>
        <input
          id="qdn-password"
          type="password"
          inputMode="text"
          autoComplete="off"
          autoFocus
          className={styles.input}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
        />

        {error && <div className={styles.error}>{error}</div>}

        <button
          type="submit"
          className={styles.button}
          disabled={submitting || password.length === 0}
        >
          {submitting ? "Checking…" : "Unlock"}
        </button>

        <p className={styles.footnote}>
          This link is not part of the main operations system and does not
          require a staff account.
        </p>
      </form>
    </div>
  );
}