"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import type {
  OperationsTeamData,
} from "@/types/operations";

interface OperationsDataContextValue {
  tasks: OperationsTeamData["tasks"];
  buckets: OperationsTeamData["buckets"];
  users: OperationsTeamData["users"];
  employees: OperationsTeamData["employees"];
  unassignedTasks: OperationsTeamData["unassignedTasks"];
  overall: OperationsTeamData["overall"];

  loading: boolean;
  error: string | null;

  status: OperationsTeamData["status"] | null;

  lastUpdated: string | null;

  refresh: () => void;
}

const OperationsDataContext =
  createContext<
    OperationsDataContextValue | undefined
  >(undefined);

export function OperationsDataProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [data, setData] =
    useState<OperationsTeamData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        "/api/operations/data",
        {
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error(
          `Request failed (${response.status})`
        );
      }

      const json: OperationsTeamData =
        await response.json();

      setData(json);

      if (json.status === "error") {
        setError(
          json.message ??
            "Unable to load Main Operations data."
        );
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Failed to load Main Operations data."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const value: OperationsDataContextValue = {
    tasks: data?.tasks ?? [],
    buckets: data?.buckets ?? [],
    users: data?.users ?? [],

    employees: data?.employees ?? [],
    unassignedTasks:
      data?.unassignedTasks ?? [],

    overall:
      data?.overall ?? {
        totalUniqueTasks: 0,
        completedUniqueTasks: 0,
        completionPercentage: null,
      },

    loading,
    error,

    status: data?.status ?? null,

    lastUpdated:
      data?.lastUpdated ?? null,

    refresh: load,
  };

  console.log(value)

  return (
    <OperationsDataContext.Provider
      value={value}
    >
      {children}
    </OperationsDataContext.Provider>
  );
}

export function useOperationsData() {
  const context =
    useContext(OperationsDataContext);

  if (!context) {
    throw new Error(
      "useOperationsData must be used within an OperationsDataProvider"
    );
  }

  return context;
}