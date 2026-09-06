"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MILESTONE_TIMER_CONFIG,
  type MilestoneTimerStatus,
} from "@/config/milestoneTimer";

export interface MilestoneTimerState {
  status: MilestoneTimerStatus;
  title: string;
  startDate: Date;
  endDate: Date;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  msRemaining: number;
}

function clampToZero(ms: number): number {
  return ms > 0 ? ms : 0;
}

function breakdownMs(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds };
}

function computeState(now: Date): MilestoneTimerState {
  const startDate = new Date(MILESTONE_TIMER_CONFIG.startDate);
  const endDate = new Date(MILESTONE_TIMER_CONFIG.endDate);

  let status: MilestoneTimerStatus;
  let msRemaining: number;

  if (now.getTime() < startDate.getTime()) {
    status = "pending";
    msRemaining = clampToZero(startDate.getTime() - now.getTime());
  } else if (now.getTime() <= endDate.getTime()) {
    status = "in-progress";
    msRemaining = clampToZero(endDate.getTime() - now.getTime());
  } else {
    status = "completed";
    msRemaining = 0;
  }

  const { days, hours, minutes, seconds } = breakdownMs(msRemaining);

  return {
    status,
    title: MILESTONE_TIMER_CONFIG.title,
    startDate,
    endDate,
    days,
    hours,
    minutes,
    seconds,
    msRemaining,
  };
}

export function useMilestoneTimer(): MilestoneTimerState {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return useMemo(() => computeState(now), [now]);
}