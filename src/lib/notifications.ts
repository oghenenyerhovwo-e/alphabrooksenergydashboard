import { prisma } from "@/lib/prisma";
import { UserRole } from "@/generated/prisma/client";

export async function createNewLeadNotification(
  leadId: string,
  leadReferenceNumber: string
): Promise<void> {
  try {
    const operationsManager = await prisma.user.findFirst({
      where: {
        role: UserRole.OPERATIONS,
        status: "ACTIVE",
      },
      select: {
        id: true,
      },
    });

    if (!operationsManager) {
      console.warn(
        "[createNewLeadNotification] No active Operations Manager found."
      );
      return;
    }

    await prisma.notification.create({
      data: {
        recipientId: operationsManager.id,
        leadId,
        title: "New Lead Requires Follow-up",
        message: `Lead ${leadReferenceNumber} has entered the system and requires follow-up.`,
      },
    });
  } catch (error) {
    /*
     * Notification failure must not invalidate the Lead creation.
     * The Lead is already the primary business transaction.
     */
    console.error(
      "[createNewLeadNotification] Failed to create notification:",
      error
    );
  }
}

export async function createSalesProfitabilityNotification({
  internalOrderId,
  orderReference,
}: {
  internalOrderId: string;
  orderReference: string;
}) {
  const salesExecutive = await prisma.user.findFirst({
    where: {
      role: "SALES",
      isActive: true,
    },
    orderBy: {
      id: "asc",
    },
  });

  if (!salesExecutive) {
    throw new Error(
      "No active Sales Executive was found.",
    );
  }

  return prisma.notification.create({
    data: {
      recipientId: salesExecutive.id,
      title: "Profitability analysis required",
      message: `Internal order ${orderReference} requires profitability/sales analysis.`,
      internalOrderId,
      link: `/commercial/orders/${internalOrderId}/profitability`,
    },
  });
}