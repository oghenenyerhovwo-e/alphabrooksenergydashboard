import { prisma } from "@/lib/prisma";

/**
 * Generates the next Delivery Note Number for a given year.
 *
 * Format:
 * DN-2026-0001
 *
 * The sequence is generated using a database-backed atomic increment.
 * Never use count() + 1.
 */
export async function generateDeliveryNoteNumber(
  referenceDate: Date = new Date()
): Promise<string> {
  const year = referenceDate.getFullYear();

  const counter = await prisma.deliveryNoteCounter.upsert({
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

  return `DN-${year}-${sequence}`;
}