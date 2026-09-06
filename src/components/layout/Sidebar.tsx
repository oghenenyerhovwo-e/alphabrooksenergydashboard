"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_SECTIONS } from "@/config/nav";
import styles from "./Sidebar.module.css";

export function Sidebar({
  mobileOpen,
  onClose,
}: {
  mobileOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside className={`${styles.sidebar} ${mobileOpen ? styles.open : ""}`}>
      <div className={styles.brand}>
        <div className={styles.mark}>AB</div>
        <div className={styles.name}>Alpha Brooks Energy</div>
        <div className={styles.sub}>Operations Platform</div>
      </div>

      <nav className={styles.nav}>
        {NAV_SECTIONS.map((section, i) => (
          <div key={i} className={section.divider ? styles.dividedSection : undefined}>
            {section.items.map((item) => {
              const active =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`${styles.navItem} ${active ? styles.active : ""}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className={styles.foot}>
        <div className={styles.footLabel}>Environment</div>
        <div className={styles.footRow}>
          <span>Graph</span>
          <b>Not connected</b>
        </div>
        <div className={styles.stamp}>Phase 1 · Foundation build</div>
      </div>
    </aside>
  );
}