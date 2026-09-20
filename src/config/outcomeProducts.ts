import type {
  OutcomeProduct,
  OutcomeUnit,
} from "@/generated/prisma/enums";

/**
 * Central switch for which Outcomes products are live. Flipping CNG or
 * LPG to "ACTIVE" here is the entire activation step — no schema or
 * calculation-layer change is required, because OutcomeTarget/
 * OutcomeAchievement never reference this file; it only gates which
 * products a future admin UI (Phase 5) offers for target entry.
 *
 * AGO is active from day one. CNG and LPG are dormant per the current
 * business rollout — not because the domain can't support them yet.
 */
export const OUTCOME_PRODUCT_STATUS: Record<OutcomeProduct, "ACTIVE" | "DORMANT"> = {
  AGO: "ACTIVE",
  CNG: "DORMANT",
  LPG: "DORMANT",
};

export function isOutcomeProductActive(product: OutcomeProduct): boolean {
  return OUTCOME_PRODUCT_STATUS[product] === "ACTIVE";
}

export function getActiveOutcomeProducts(): OutcomeProduct[] {
  return (Object.keys(OUTCOME_PRODUCT_STATUS) as OutcomeProduct[]).filter(isOutcomeProductActive);
}

/**
 * Which measurement units make sense for each product. This is a
 * BUSINESS ASSUMPTION, not something confirmed against a real Outcomes
 * spec sheet — see Phase 1 completion report §8 (Risks). Adjust freely;
 * nothing else depends on these exact combinations.
 */
export const OUTCOME_PRODUCT_ALLOWED_UNITS: Record<OutcomeProduct, OutcomeUnit[]> = {
  AGO: ["LITRES"],
  CNG: ["SCM", "KG"],
  LPG: ["KG", "TONNES", "LITRES"],
};

export function isUnitAllowedForProduct(product: OutcomeProduct, unit: OutcomeUnit): boolean {
  return OUTCOME_PRODUCT_ALLOWED_UNITS[product].includes(unit);
}