import type { CngPhaseStatus } from "@/types/cng";

/**
 * Optional, purely cosmetic metadata for specific buckets, keyed by live
 * Planner bucket ID. The app works fully with this map empty — buckets
 * are fetched, ordered (via Graph's own orderHint), and named entirely
 * from the API. Add an entry here ONLY if you want a shorter display
 * label or a group tag for a specific bucket.
 *
 * Adding, removing, or renaming a bucket in Planner needs ZERO changes
 * here — it just appears/disappears/renames itself automatically.
 */
export const BUCKET_CONFIG: Record<string, { shortName?: string; group?: string }> = {
  "Wxwt4Yl2wkCURaP6pvIpYGUAFiCd": { shortName: "Admin", group: "Setup" },
  "3tE3O5NCm0u_qbyHzhddSmUANt7B": { shortName: "Commercial", group: "Setup" },
  "BZVRl9fYWE2Fs0DSZZ0JuGUACVU1": { shortName: "NMDPRA", group: "Regulatory" },
  "34QRGV2LsES1SNabKN5u_WUAKEoO": { shortName: "NGMLC", group: "Regulatory" },
  "8KYX0UiLV0m9HnLcxUym82UAI57p": { shortName: "MDGIF", group: "Regulatory" },
  "05pxgng8CUeTI2wFmAQRHmUAC4K7": { shortName: "Procurement", group: "Delivery" },
  "4n_F8gXB_kCaym1vKana2WUAAyXv": { shortName: "Civil", group: "Delivery" },
  "9UcAV9LNOU2l39OBMI1numUAIT0S": { shortName: "Installation", group: "Delivery" },
  "47PXc2rsz0KFkiooATWhdGUADQvF": { shortName: "Testing", group: "Delivery" },
};

export const PHASE_STATUS_LABELS: Record<CngPhaseStatus, string> = {
  NOT_YET_POPULATED: "Not yet populated",
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  COMPLETE: "Complete",
};