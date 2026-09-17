"use client";

import { useEffect } from "react";
import { authentication } from "@microsoft/teams-js";

export default function TeamsAuthCompletePage() {
  useEffect(() => {
    async function completeAuthentication() {
      try {
        await authentication.notifySuccess(
          "authenticated"
        );
      } catch (error) {
        console.error(
          "[Teams] Could not notify parent window:",
          error
        );
      }
    }

    completeAuthentication();
  }, []);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        fontFamily:
          "Arial, sans-serif",
        background: "#ffffff",
      }}
    >
      <div
        style={{
          textAlign: "center",
          padding: "32px",
        }}
      >
        <div
          style={{
            width: "36px",
            height: "36px",
            margin: "0 auto 16px",
            border:
              "3px solid #e5e7eb",
            borderTopColor:
              "#58c76b",
            borderRadius: "50%",
            animation:
              "spin 0.8s linear infinite",
          }}
        />

        <p
          style={{
            margin: 0,
            color: "#374151",
            fontSize: "15px",
          }}
        >
          Completing sign in…
        </p>
      </div>

      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </main>
  );
}