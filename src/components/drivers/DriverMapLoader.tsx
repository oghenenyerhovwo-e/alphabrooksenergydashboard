"use client";

import dynamic from "next/dynamic";
import styles from "./DriverMapLoader.module.css";

const DriverMap = dynamic(() => import("./DriverMap").then((mod) => mod.DriverMap), {
  ssr: false,
  loading: () => (
    <div className={styles.loading}>
      <div className={styles.spinner} />
      <span>Loading map…</span>
    </div>
  ),
});

export function DriverMapLoader() {
  return <DriverMap />;
}