import type { Metadata } from "next";
import { Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";
import { CngDataProvider } from "@/context/CngDataContext";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-ui",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Alpha Brooks Energy — Operations Platform",
  description: "Master operations command centre",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${manrope.variable} ${jetbrainsMono.variable}`}>
      <body style={{ fontFamily: "var(--font-ui), -apple-system, sans-serif" }}>
        <CngDataProvider>
          <AppShell>{children}</AppShell>
        </CngDataProvider>
      </body>
    </html>
  );
}