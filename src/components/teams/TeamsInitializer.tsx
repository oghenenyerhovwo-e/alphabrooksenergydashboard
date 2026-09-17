"use client";

import { useEffect } from "react";
import { app } from "@microsoft/teams-js";

export function TeamsInitializer() {
  useEffect(() => {
    let mounted = true;

    async function initializeTeams() {
      try {
        await app.initialize();

        if (mounted) {
          console.log("[Teams] TeamsJS initialized.");
        }
      } catch (error) {
        // The application also runs normally in Chrome.
        // Therefore, failing Teams initialization should not
        // break the normal web application.
        console.debug("[Teams] Not running inside Teams.", error);
      }
    }

    initializeTeams();

    return () => {
      mounted = false;
    };
  }, []);

  return null;
}