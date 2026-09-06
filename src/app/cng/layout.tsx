"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./layout.module.css";

interface CngTab {
  label: string;
  href: string;
}

const CNG_TABS: CngTab[] = [
  { label: "Overview", href: "/cng" },
  { label: "Team", href: "/cng/team" },
  { label: "Buckets", href: "/cng/buckets" },
  { label: "Deadlines", href: "/cng/deadlines" },
  { label: "Needs Attention", href: "/cng/attention" },
  { label: "Tasks", href: "/cng/tasks" },
  { label: "Intelligence", href: "/cng/intelligence" },
];

export default function CngLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.eyebrow}>CNG OPERATIONS</span>
      </div>

      <nav className={styles.tabBar} aria-label="CNG section navigation">
        {CNG_TABS.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={isActive ? `${styles.tab} ${styles.tabActive}` : styles.tab}
              aria-current={isActive ? "page" : undefined}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <div className={styles.body}>{children}</div>
    </div>
  );
}