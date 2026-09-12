import { DeliveryStatus } from "@/generated/prisma/client";

export type DeliveryStatusGroup =
  | "PENDING"
  | "IN_PROGRESS"
  | "COMPLETED";

/**
 * Single source of truth for grouping a delivery's granular
 * DeliveryStatus into the three buckets shown across the app
 * (driver list, delivery detail, Operations dashboard).
 *
 * Do not re-implement this mapping anywhere else — import this
 * function instead.
 */
export function getDeliveryStatusGroup(
  status: DeliveryStatus
): DeliveryStatusGroup {
  switch (status) {
    case DeliveryStatus.DRAFT:
    case DeliveryStatus.ASSIGNED:
    case DeliveryStatus.DISPATCHED:
      return "PENDING";

    case DeliveryStatus.IN_TRANSIT:
      return "IN_PROGRESS";

    case DeliveryStatus.DELIVERED:
    case DeliveryStatus.PARTIALLY_DELIVERED:
    case DeliveryStatus.REJECTED:
    case DeliveryStatus.FAILED:
    case DeliveryStatus.RETURNED:
    case DeliveryStatus.CANCELLED:
      return "COMPLETED";

    default: {
      // Exhaustiveness check: if a new DeliveryStatus is ever added
      // to the schema without updating this switch, this will fail
      // to compile instead of silently miscategorizing it.
      const _exhaustiveCheck: never = status;
      return _exhaustiveCheck;
    }
  }
}