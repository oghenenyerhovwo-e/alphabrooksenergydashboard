import type { User } from "@/generated/prisma/client";

/**
 * The Managing Director remains an ADMIN and keeps full access
 * to the Outcomes administration area, but does not receive
 * an individual staff target.
 *
 * This is intentionally kept here as an Outcomes eligibility rule.
 * It does not change the user's role or permissions anywhere else
 * in the application.
 */
const MANAGING_DIRECTOR_NAME = "Eke Nwannediya Stephanie";

/**
 * OUTCOME STAFF ELIGIBILITY
 *
 * An active staff member can have an individual outcome target.
 *
 * The Managing Director is intentionally excluded from individual
 * target assignment while remaining an ADMIN.
 */
export function isEligibleForOutcomeTargets(
  user: Pick<User, "name" | "role" | "status">
): boolean {
  if (user.status !== "ACTIVE") {
    return false;
  }

  if (user.name.trim() === MANAGING_DIRECTOR_NAME) {
    return false;
  }

  return true;
}

/**
 * Convenience helper used by the Admin Target Console.
 */
export function filterEligibleOutcomeStaff<
  T extends Pick<User, "name" | "role" | "status">
>(users: T[]): T[] {
  return users.filter(isEligibleForOutcomeTargets);
}