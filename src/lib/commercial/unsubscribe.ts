import "server-only";
import { createHmac } from "crypto";
import { prisma } from "@/lib/prisma";

export function buildUnsubscribeToken(email: string): string {
  const secret = process.env.DAILY_PRICE_UNSUBSCRIBE_SECRET;

  if (!secret) {
    throw new Error("Missing DAILY_PRICE_UNSUBSCRIBE_SECRET");
  }

  return createHmac("sha256", secret)
    .update(email.trim().toLowerCase())
    .digest("hex")
    .slice(0, 24);
}

export function buildUnsubscribeUrl(email: string): string {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://alphabrooksenergy.com";
  const token = buildUnsubscribeToken(email);

  const url = new URL("/api/daily-price/unsubscribe", appUrl);
  url.searchParams.set("email", email.trim().toLowerCase());
  url.searchParams.set("token", token);

  return url.toString();
}

export async function filterUnsubscribed<T extends { email: string }>(
  customers: T[]
): Promise<T[]> {
  if (customers.length === 0) {
    return customers;
  }

  const unsubscribed = await prisma.dailyPriceUnsubscribe.findMany({
    select: { email: true },
  });

  const unsubscribedSet = new Set(
    unsubscribed.map((row) => row.email.toLowerCase())
  );

  return customers.filter(
    (customer) => !unsubscribedSet.has(customer.email.trim().toLowerCase())
  );
}