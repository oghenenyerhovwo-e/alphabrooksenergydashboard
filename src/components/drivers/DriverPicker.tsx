"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./DriverPicker.module.css";

interface DriverOption {
  id: string;
  name: string;
}

export function DriverPicker({
  drivers,
}: {
  drivers: DriverOption[];
}) {
  const router = useRouter();
  const [selectedDriverId, setSelectedDriverId] = useState("");

  function handleView() {
    if (!selectedDriverId) return;
    router.push(`/drivers/${selectedDriverId}`);
  }

  return (
    <div className={styles.picker}>
      <select
        className={styles.select}
        value={selectedDriverId}
        onChange={(e) => setSelectedDriverId(e.target.value)}
      >
        <option value="">Select your name…</option>
        {drivers.map((driver) => (
          <option key={driver.id} value={driver.id}>
            {driver.name}
          </option>
        ))}
      </select>

      <button
        type="button"
        className={styles.button}
        disabled={!selectedDriverId}
        onClick={handleView}
      >
        View my deliveries
      </button>
    </div>
  );
}