"use client";

import { usePathname } from "next/navigation";
import { NAV_SECTIONS } from "@/config/nav";
import styles from "./Topbar.module.css";

function currentTitle(pathname: string): { eyebrow: string; title: string } {
  for (const section of NAV_SECTIONS) {
    for (const item of section.items) {
      if (item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)) {
        return { eyebrow: "Alpha Brooks Energy", title: item.label };
      }
    }
  }
  return { eyebrow: "Alpha Brooks Energy", title: "Operations" };
}

export function Topbar({ onMobileToggle }: { onMobileToggle: () => void }) {
  const pathname = usePathname();
  const { eyebrow, title } = currentTitle(pathname);

  return (
    <header className={styles.topbar}>
      <div>
        <button className={styles.mobileToggle} onClick={onMobileToggle} aria-label="Open menu">
          ☰
        </button>
        <div className={styles.eyebrow}>{eyebrow}</div>
        <h1 className={styles.title}>{title}</h1>
      </div>
      <div className={styles.meta}>
        <div className={styles.metaLabel}>Master Operations Platform</div>
      </div>
    </header>
  );
}