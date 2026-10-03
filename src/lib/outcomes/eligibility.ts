import type { User } from "@/generated/prisma/client";

/**
 * OUTCOME STAFF ELIGIBILITY
 *
 * An active staff member can have an individual outcome target,
 * unless their role is MANAGEMENT. Management sets direction but
 * does not receive an individual staff target.
 *
 * This is an Outcomes eligibility rule only. It does not change
 * anyone's permissions elsewhere in the application.
 */
export function isEligibleForOutcomeTargets(
  user: Pick<User, "name" | "role" | "status">
): boolean {
  return user.status === "ACTIVE" && user.role !== "MANAGEMENT";
}

/**
 * Convenience helper used by the Admin Target Console.
 */
export function filterEligibleOutcomeStaff<
  T extends Pick<User, "name" | "role" | "status">
>(users: T[]): T[] {
  return users.filter(isEligibleForOutcomeTargets);
}