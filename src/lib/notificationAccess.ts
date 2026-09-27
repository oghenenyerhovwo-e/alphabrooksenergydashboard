/**
 * Accounts that can see EVERY notification in the system, in addition
 * to the notifications addressed to them.
 *
 * Identified by Microsoft Entra object ID (User.entraId), the same IDs
 * used in scripts/seed-initial-users.ts.
 *
 * Deliberately a short explicit list rather than "all ADMIN users":
 * more than one account has the ADMIN role, and seeing everyone's
 * notifications is a narrower privilege than being an admin.
 */
const NOTIFICATION_SUPERVISOR_ENTRA_IDS: ReadonlySet<string> = new Set([
  "68349eb7-ffbc-42f0-abd3-e9e6efddbb55", // IT Alphabrooks Energy
]);

export function canSeeAllNotifications(user: { entraId: string }): boolean {
  return NOTIFICATION_SUPERVISOR_ENTRA_IDS.has(user.entraId);
}