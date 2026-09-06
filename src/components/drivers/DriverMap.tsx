"use client";

import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import styles from "./DriverMap.module.css";

const LAGOS_CENTER: [number, number] = [6.5244, 3.3792];
const DEFAULT_ZOOM = 11;

export function DriverMap() {
  return (
    <div className={styles.wrap}>
      <MapContainer
        center={LAGOS_CENTER}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom
        className={styles.map}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
      </MapContainer>

      <div className={styles.statusBadge}>
        <span className={styles.statusDot} />
        LIVE DRIVER LOCATION DATA — NOT CONNECTED
      </div>
    </div>
  );
}