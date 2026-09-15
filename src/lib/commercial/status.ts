import { QualificationState } from "@/generated/prisma/client";

/**
 * Centralizes the qualification state machine so the same transition
 * rules are enforced consistently everywhere (actions, UI, future
 * phases) instead of being re-implemented ad hoc per call site.
 *
 * Allowed transitions:
 *   PENDING -> QUALIFIED
 *   PENDING -> DISQUALIFIED
 *
 * QUALIFIED and DISQUALIFIED are terminal in Phase 3. Re-opening a
 * decided Lead/Quote Request is intentionally out of scope here —
 * that belongs to a later phase if the business ever needs it.
 */
export type QualificationDecision = "QUALIFIED" | "DISQUALIFIED";

export function canTransitionQualification(
  current: QualificationState
): boolean {
  return current === QualificationState.PENDING;
}

export function isValidQualificationDecision(
  value: string
): value is QualificationDecision {
  return value === "QUALIFIED" || value === "DISQUALIFIED";
}

export function requiresReason(decision: QualificationDecision): boolean {
  return decision === "DISQUALIFIED";
}

/**
 * Human-readable label for qualification state, used consistently
 * across Lead and Quote Request UI so badges don't drift in wording.
 */
export function qualificationLabel(state: QualificationState): string {
  switch (state) {
    case QualificationState.PENDING:
      return "Pending";
    case QualificationState.QUALIFIED:
      return "Qualified";
    case QualificationState.DISQUALIFIED:
      return "Disqualified";
    default:
      return state;
  }
}