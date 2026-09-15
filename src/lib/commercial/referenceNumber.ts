import { prisma } from "@/lib/prisma";

/**
 * Generates the next Lead reference number for a given year.
 *
 * Format:
 * LEAD-2026-0001
 *
 * The sequence is generated using a database-backed atomic increment.
 * Never use count() + 1.
 */
export async function generateLeadReferenceNumber(
  referenceDate: Date = new Date()
): Promise<string> {
  const year = referenceDate.getFullYear();

  const counter = await prisma.leadReferenceCounter.upsert({
    where: {
      year,
    },
    create: {
      year,
      lastSequence: 1,
    },
    update: {
      lastSequence: {
        increment: 1,
      },
    },
  });

  const sequence = String(counter.lastSequence).padStart(4, "0");

  return `LEAD-${year}-${sequence}`;
}

/**
 * Generates the next Quote Request reference number for a given year.
 *
 * Format:
 * QR-2026-0001
 *
 * Shares the same counter table as Lead references but keyed by a
 * distinct prefix, so the two sequences never collide with each other
 * while still being atomic per year.
 */
export async function generateQuoteRequestReferenceNumber(
  referenceDate: Date = new Date()
): Promise<string> {
  const year = referenceDate.getFullYear();

  const counter = await prisma.quoteRequestReferenceCounter.upsert({
    where: {
      year,
    },
    create: {
      year,
      lastSequence: 1,
    },
    update: {
      lastSequence: {
        increment: 1,
      },
    },
  });

  const sequence = String(counter.lastSequence).padStart(4, "0");

  return `QR-${year}-${sequence}`;
}