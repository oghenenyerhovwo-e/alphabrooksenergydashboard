"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { NAV_SECTIONS } from "@/config/nav";
import styles from "./Topbar.module.css";

function currentTitle(pathname: string): { eyebrow: string; title: string } {
  for (const section of NAV_SECTIONS) {
    for (const item of section.items) {
      if (item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)) {
        return { eyebrow: "Alpha Brooks Energy", title: item.label };
      }
    }
  }
  return { eyebrow: "Alpha Brooks Energy", title: "Operations" };
}

/** "BUSINESS_DEVELOPMENT" -> "Business Development" */
function formatRoleLabel(role: string): string {
  return role
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
  leadId: string | null;
  internalOrderId: string | null;
  link: string | null;
  lead: {
    referenceNumber: string;
  } | null;
};

export function Topbar({
  onMobileToggle,
  user,
}: {
  onMobileToggle: () => void;
  user: { name: string; role: string };
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const { eyebrow, title } = currentTitle(pathname);

  useEffect(() => {
    if (user.role !== "OPERATIONS") {
      return;
    }

    let cancelled = false;

    async function loadNotifications() {
      try {
        const response = await fetch("/api/notifications", {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const data = await response.json();

        if (cancelled) {
          return;
        }

        setNotifications(data.notifications ?? []);
        setUnreadCount(data.unreadCount ?? 0);
      } catch (error) {
        console.error(
          "[Topbar] Failed to load notifications:",
          error
        );
      }
    }

    loadNotifications();

    const interval = window.setInterval(
      loadNotifications,
      30000
    );

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [user.role]);

  async function openNotification(
    notification: NotificationItem
  ) {
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          notificationId: notification.id,
        }),
      });

      if (!response.ok) {
        return;
      }

      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? {
                ...item,
                readAt: new Date().toISOString(),
              }
            : item
        )
      );

      setUnreadCount((current) =>
        notification.readAt === null
          ? Math.max(0, current - 1)
          : current
      );

      setNotificationsOpen(false);

      if (notification.link) {
        router.push(notification.link);
      } else if (notification.leadId) {
        router.push(`/commercial/leads/${notification.leadId}`);
      }
    } catch (error) {
      console.error(
        "[Topbar] Failed to mark notification as read:",
        error
      );
    }
  }

  return (
    <header className={styles.topbar}>
      <div>
        <button className={styles.mobileToggle} onClick={onMobileToggle} aria-label="Open menu">
          ☰
        </button>
        <div className={styles.eyebrow}>{eyebrow}</div>
        <h1 className={styles.title}>{title}</h1>
      </div>
      <div className={styles.meta}>
        <div className={styles.metaLabel}>Master Operations Platform</div>
        <div className={styles.userRow}>
          {user.role === "OPERATIONS" && (
            <div className={styles.notificationWrap}>
              <button
                type="button"
                className={styles.notificationButton}
                onClick={() =>
                  setNotificationsOpen((current) => !current)
                }
                aria-label={
                  unreadCount > 0
                    ? `${unreadCount} unread notifications`
                    : "Notifications"
                }
              >
                <span className={styles.notificationIcon}>
                  🔔
                </span>

                {unreadCount > 0 && (
                  <span className={styles.notificationBadge}>
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className={styles.notificationPanel}>
                  <div className={styles.notificationHeader}>
                    Notifications
                  </div>

                  {notifications.length === 0 ? (
                    <div className={styles.notificationEmpty}>
                      No notifications.
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <button
                        key={notification.id}
                        type="button"
                        className={`${styles.notificationItem} ${
                          notification.readAt === null
                            ? styles.notificationUnread
                            : ""
                        }`}
                        onClick={() =>
                          openNotification(notification)
                        }
                      >
                        <div className={styles.notificationTitle}>
                          {notification.title}
                        </div>

                        <div className={styles.notificationMessage}>
                          {notification.message}
                        </div>

                        {notification.lead && (
                          <div className={styles.notificationLead}>
                            {notification.lead.referenceNumber}
                          </div>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          <span className={styles.userName}>{user.name}</span>
          <span className={styles.userRole}>{formatRoleLabel(user.role)}</span>
          {/*
            Plain form POST, not a fetch — logout must work even if client
            JS hasn't hydrated yet, and POST-only keeps it un-triggerable
            by a stray link or <img> tag (see the route's own comment).
          */}
          <form action="/api/auth/logout" method="POST" className={styles.logoutForm}>
            <button type="submit" className={styles.logoutBtn}>
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}