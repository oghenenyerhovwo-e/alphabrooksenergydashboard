import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";
import { CngDataProvider } from "@/context/CngDataContext";
import { getCurrentUser } from "@/lib/auth/session";

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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // /login is a deliberate, narrow exception to "every page requires a
  // session." It has to render for signed-out visitors — that's its whole
  // purpose — so it cannot go through the same "no user -> redirect to
  // /login" check below, or it would redirect to itself forever.
  // Middleware stamps the real pathname onto this header because
  // next/navigation has no server-side "current pathname" API.
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";
  const isLoginRoute = pathname === "/login";

  // Real enforcement (DB-verified), not just the middleware's cookie
  // presence check. Every page in the app renders through this layout,
  // so this is a single choke point rather than a per-page check.
  const user = await getCurrentUser();

  if (!user && !isLoginRoute) {
    redirect("/login");
  }

  return (
    <html lang="en" className={`${manrope.variable} ${jetbrainsMono.variable}`}>
      <body style={{ fontFamily: "var(--font-ui), -apple-system, sans-serif" }}>
        {isLoginRoute ? (
          children
        ) : (
          <CngDataProvider>
            <AppShell user={{ name: user!.name, role: user!.role }}>{children}</AppShell>
          </CngDataProvider>
        )}
      </body>
    </html>
  );
}