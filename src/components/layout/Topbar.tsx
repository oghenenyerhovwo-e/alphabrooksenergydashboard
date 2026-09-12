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

/** "BUSINESS_DEVELOPMENT" -> "Business Development" */
function formatRoleLabel(role: string): string {
  return role
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

export function Topbar({
  onMobileToggle,
  user,
}: {
  onMobileToggle: () => void;
  user: { name: string; role: string };
}) {
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
        <div className={styles.userRow}>
          <span className={styles.userName}>{user.name}</span>
          <span className={styles.userRole}>{formatRoleLabel(user.role)}</span>
          {/*
            Plain form POST, not a fetch — logout must work even if client
            JS hasn't hydrated yet, and POST-only keeps it un-triggerable
            by a stray link or <img> tag (see the route's own comment).
          */}
          <form action="/api/auth/logout" method="POST" className={styles.logoutForm}>
            <button type="submit" className={styles.logoutBtn}>
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}