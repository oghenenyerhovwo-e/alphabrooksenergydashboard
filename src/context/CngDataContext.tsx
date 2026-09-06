"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { CngData } from "@/types/cng";

interface CngDataContextValue {
  tasks: CngData["tasks"];
  buckets: CngData["buckets"];
  users: CngData["users"];
  loading: boolean;
  error: string | null;
  status: CngData["status"] | null;
  lastUpdated: string | null;
  refresh: () => void;
}

const CngDataContext = createContext<CngDataContextValue | undefined>(undefined);

export function CngDataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<CngData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/cng/data", { cache: "no-store" });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const json: CngData = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load CNG data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const value: CngDataContextValue = {
    tasks: data?.tasks ?? [],
    buckets: data?.buckets ?? [],
    users: data?.users ?? [],
    loading,
    error,
    status: data?.status ?? null,
    lastUpdated: data?.lastUpdated ?? null,
    refresh: load,
  };

  return <CngDataContext.Provider value={value}>{children}</CngDataContext.Provider>;
}

export function useCngData() {
  const ctx = useContext(CngDataContext);
  if (!ctx) throw new Error("useCngData must be used within a CngDataProvider");
  return ctx;
}