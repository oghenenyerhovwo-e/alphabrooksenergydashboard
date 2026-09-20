import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/generated/prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401 }
    );
  }

  if (currentUser.role !== UserRole.OPERATIONS) {
    return NextResponse.json({
      unreadCount: 0,
      notifications: [],
    });
  }

  const notifications = await prisma.notification.findMany({
    where: {
      recipientId: currentUser.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 20,
    select: {
      id: true,
      title: true,
      message: true,
      readAt: true,
      createdAt: true,
      leadId: true,
      internalOrderId: true,
      link: true,
      lead: {
        select: {
          referenceNumber: true,
        },
      },
    },
  });

  const unreadCount = notifications.filter(
    (notification) => notification.readAt === null
  ).length;

  return NextResponse.json({
    unreadCount,
    notifications,
  });
}

export async function PATCH(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401 }
    );
  }

  if (currentUser.role !== UserRole.OPERATIONS) {
    return NextResponse.json(
      { error: "Forbidden." },
      { status: 403 }
    );
  }

  let body: { notificationId?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }

  if (
    typeof body.notificationId !== "string" ||
    body.notificationId.trim().length === 0
  ) {
    return NextResponse.json(
      { error: "Notification ID is required." },
      { status: 400 }
    );
  }

  const notification = await prisma.notification.findFirst({
    where: {
      id: body.notificationId,
      recipientId: currentUser.id,
    },
    select: {
      id: true,
      leadId: true,
    },
  });

  if (!notification) {
    return NextResponse.json(
      { error: "Notification not found." },
      { status: 404 }
    );
  }

  await prisma.notification.update({
    where: {
      id: notification.id,
    },
    data: {
      readAt: new Date(),
    },
  });

  return NextResponse.json({
    success: true,
    leadId: notification.leadId,
  });
}