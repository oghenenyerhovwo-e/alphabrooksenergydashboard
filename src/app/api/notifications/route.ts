import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { canSeeAllNotifications } from "@/lib/notificationAccess";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const OWN_LIMIT = 20;
const SUPERVISOR_LIMIT = 50;

export async function GET() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401 }
    );
  }

  const seesAll = canSeeAllNotifications(currentUser);

  const [rows, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      // Everyone sees the notifications addressed to them.
      // Supervisors see all of them.
      where: seesAll ? {} : { recipientId: currentUser.id },
      orderBy: {
        createdAt: "desc",
      },
      take: seesAll ? SUPERVISOR_LIMIT : OWN_LIMIT,
      select: {
        id: true,
        title: true,
        message: true,
        readAt: true,
        createdAt: true,
        leadId: true,
        internalOrderId: true,
        link: true,
        recipientId: true,
        recipient: {
          select: {
            name: true,
          },
        },
        lead: {
          select: {
            referenceNumber: true,
          },
        },
      },
    }),
    // The badge always counts only the current user's OWN unread items.
    // (Counting other people's unread items would leave a badge the
    // supervisor can never clear, because only the recipient can mark
    // a notification as read.)
    prisma.notification.count({
      where: {
        recipientId: currentUser.id,
        readAt: null,
      },
    }),
  ]);

  const notifications = rows.map(
    ({ recipientId, recipient, ...notification }) => ({
      ...notification,
      isOwn: recipientId === currentUser.id,
      recipientName: recipient.name,
    })
  );

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

  let body: {
  notificationId?: unknown;
  markAll?: unknown;
};

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

  if (body.markAll === true) {
    const result = await prisma.notification.updateMany({
      where: {
        recipientId: currentUser.id,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      markedRead: result.count,
    });
  }

  /*
   * Only the RECIPIENT can mark a notification as read, including for
   * supervisors. Reading someone else's notification must never clear
   * their acknowledgement / escalation clock.
   */
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