/**
 * Accounts that can see EVERY notification in the system, in addition
 * to the notifications addressed to them.
 *
 * Identified by Microsoft Entra object ID (User.entraId), the same IDs
 * used in scripts/seed-initial-users.ts.
 *
 * Deliberately a short explicit list rather than "all IT users":
 * more than one account may have the IT role, and seeing everyone's
 * notifications is a narrower privilege than being IT.
 *
 * Staff without a Microsoft account (entraId = null) never qualify.
 */
const NOTIFICATION_SUPERVISOR_ENTRA_IDS: ReadonlySet<string> = new Set([
  "68349eb7-ffbc-42f0-abd3-e9e6efddbb55", // IT Alphabrooks Energy
]);

export function canSeeAllNotifications(user: {
  entraId: string | null;
}): boolean {
  if (user.entraId === null) {
    return false;
  }

  return NOTIFICATION_SUPERVISOR_ENTRA_IDS.has(user.entraId);
}