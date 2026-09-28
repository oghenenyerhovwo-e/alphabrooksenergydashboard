import type { Metadata } from "next";
import { hasValidQuickNoteSession } from "@/lib/quickDeliveryNote/session";
import { QuickNotePasswordGate } from "@/components/quickDeliveryNote/QuickNotePasswordGate";
import { QuickDeliveryNoteApp } from "@/components/quickDeliveryNote/QuickDeliveryNoteApp";

export const metadata: Metadata = {
  title: "Quick Delivery Note — Alpha Brooks Energy",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function QuickDeliveryNotePage() {
  const authed = await hasValidQuickNoteSession();

  if (!authed) {
    return <QuickNotePasswordGate />;
  }

  return <QuickDeliveryNoteApp />;
}