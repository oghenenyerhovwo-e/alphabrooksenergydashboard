import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import {
  Manrope,
  JetBrains_Mono,
} from "next/font/google";

import "./globals.css";

import { AppShell } from "@/components/layout/AppShell";

import {
  CngDataProvider,
} from "@/context/CngDataContext";

import {
  OperationsDataProvider,
} from "@/context/OperationsDataContext";

import {
  getCurrentUser,
} from "@/lib/auth/session";

const manrope = Manrope({
  subsets: ["latin"],
  weight: [
    "400",
    "500",
    "600",
    "700",
    "800",
  ],
  variable: "--font-ui",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title:
    "Alpha Brooks Energy — Operations Platform",
  description:
    "Master operations command centre",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();

  const pathname =
    headersList.get("x-pathname") ?? "";

  const isLoginRoute =
    pathname === "/login";

  const user = await getCurrentUser();

  if (!user && !isLoginRoute) {
    redirect("/login");
  }

  return (
    <html
      lang="en"
      className={`${manrope.variable} ${jetbrainsMono.variable}`}
    >
      <body
        style={{
          fontFamily:
            "var(--font-ui), -apple-system, sans-serif",
        }}
      >
        {isLoginRoute ? (
          children
        ) : (
          <CngDataProvider>
            <OperationsDataProvider>
              <AppShell
                user={{
                  name: user!.name,
                  role: user!.role,
                }}
              >
                {children}
              </AppShell>
            </OperationsDataProvider>
          </CngDataProvider>
        )}
      </body>
    </html>
  );
}