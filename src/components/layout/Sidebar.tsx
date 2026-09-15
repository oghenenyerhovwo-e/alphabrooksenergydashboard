"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_SECTIONS } from "@/config/nav";
import styles from "./Sidebar.module.css";

/**
 * Picks the single nav item that should be highlighted: the one whose
 * href is the LONGEST prefix of the current path.
 *
 * The previous rule was a plain `pathname.startsWith(item.href)` per item,
 * which lit up every ancestor at once. That only became visible when
 * Phase 7 added /operations/daily-reports beneath /operations. Longest
 * match preserves every existing behaviour — /operations/deliveries/123
 * still highlights Main Operations, /cng/tasks still highlights CNG
 * Operations — while highlighting only the most specific entry.
 */
function resolveActiveHref(pathname: string, hrefs: string[]): string | null {
  let best: string | null = null;

  for (const href of hrefs) {
    const matches =
      href === "/"
        ? pathname === "/"
        : pathname === href || pathname.startsWith(`${href}/`);

    if (matches && (best === null || href.length > best.length)) {
      best = href;
    }
  }

  return best;
}

export function Sidebar({
  mobileOpen,
  onClose,
}: {
  mobileOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  const activeHref = useMemo(() => {
    const hrefs = NAV_SECTIONS.flatMap((section) =>
      section.items.map((item) => item.href)
    );
    return resolveActiveHref(pathname, hrefs);
  }, [pathname]);

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
              const active = item.href === activeHref;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`${styles.navItem} ${active ? styles.active : ""}`}
                  aria-current={active ? "page" : undefined}
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