"use client";

import { useState } from "react";
import { AriaWidget } from "@/components/aria/AriaWidget";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import styles from "./AppShell.module.css";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className={styles.app}>
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      {mobileOpen && <div className={styles.scrim} onClick={() => setMobileOpen(false)} />}
      <div className={styles.main}>
        <Topbar onMobileToggle={() => setMobileOpen(true)} />
        <div className={styles.content}>{children}</div>
         <AriaWidget />
      </div>
    </div>
  );
}