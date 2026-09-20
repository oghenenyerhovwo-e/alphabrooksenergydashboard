import { LeadStatus, QualificationState } from "@/generated/prisma/client";

/**
 * Phase 1 Lead lifecycle.
 *
 * NEW
 *   ↓
 * FOLLOW_UP
 *   ↓
 * PROSPECT
 *
 * Or an unsuccessful outcome:
 *
 * LOST
 * UNQUALIFIED
 * NOT_INTERESTED
 */

export const LEAD_ACTIVE_STATUSES: LeadStatus[] = [
  LeadStatus.NEW,
  LeadStatus.FOLLOW_UP,
  LeadStatus.PROSPECT,
];

export const LEAD_OUTCOME_STATUSES: LeadStatus[] = [
  LeadStatus.LOST,
  LeadStatus.UNQUALIFIED,
  LeadStatus.NOT_INTERESTED,
];

export function isLeadActive(status: LeadStatus): boolean {
  return LEAD_ACTIVE_STATUSES.includes(status);
}

export function isLeadOutcome(status: LeadStatus): boolean {
  return LEAD_OUTCOME_STATUSES.includes(status);
}

export function canMoveLeadToFollowUp(status: LeadStatus): boolean {
  return status === LeadStatus.NEW;
}

export function canMoveLeadToProspect(status: LeadStatus): boolean {
  return status === LeadStatus.NEW || status === LeadStatus.FOLLOW_UP;
}

export function canCloseLeadWithOutcome(status: LeadStatus): boolean {
  return isLeadActive(status);
}

export function leadStatusLabel(status: LeadStatus): string {
  switch (status) {
    case LeadStatus.NEW:
      return "New Lead";

    case LeadStatus.FOLLOW_UP:
      return "Follow-up";

    case LeadStatus.PROSPECT:
      return "Prospect";

    case LeadStatus.LOST:
      return "Lost";

    case LeadStatus.UNQUALIFIED:
      return "Unqualified";

    case LeadStatus.NOT_INTERESTED:
      return "Not Interested";

    default:
      return status;
  }
}

/*
 * QualificationState remains available for Quote Request
 * until that workflow is intentionally refactored in a later
 * implementation step.
 */
export function canTransitionQualification(
  current: QualificationState
): boolean {
  return current === QualificationState.PENDING;
}

export type QualificationDecision = "QUALIFIED" | "DISQUALIFIED";

export function isValidQualificationDecision(
  value: string
): value is QualificationDecision {
  return value === "QUALIFIED" || value === "DISQUALIFIED";
}

export function requiresReason(decision: QualificationDecision): boolean {
  return decision === "DISQUALIFIED";
}

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