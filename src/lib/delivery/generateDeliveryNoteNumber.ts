import type { Prisma } from "@/generated/prisma/client";

export async function generateDeliveryNoteNumber(
  tx: Prisma.TransactionClient,
  referenceDate: Date = new Date()
): Promise<string> {
  const year = referenceDate.getFullYear();
  const counter = await tx.deliveryNoteCounter.upsert({
    where: { year },
    create: { year, lastSequence: 1 },
    update: { lastSequence: { increment: 1 } },
  });
  return `DN-${year}-${counter.lastSequence.toString().padStart(4, "0")}`;
}

