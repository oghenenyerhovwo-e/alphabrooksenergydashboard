import {
  type DecimalInput,
  type ProfitabilityDecimal,
  toProfitabilityDecimal,
} from "./decimal";

/**
 * Profitability calculation engine.
 *
 * This reproduces PEDDLER_PROFITAILITY_ANALYSIS.xlsx exactly:
 *
 *   C9  = E9 / D9                       (overheads per litre)
 *   C10 = C8 * financeRate% / 365 * B5  (finance cost per litre)
 *   C11 = E11 / D11                     (trip expenses per litre)
 *   C12 = C8 * operationalLoss%         (operational loss per litre)
 *   C13 = SUM(C8:C12)                   (Total Landing Cost per litre)
 *   C14 = C13 * targetMargin%           (margin per litre)
 *   C15 = C13 + C14                     (LPO Amount per litre)
 *
 * The Excel's D8:D15 are eight separate cells that must be kept equal
 * by hand for the sheet to be internally consistent (C9 and C11 divide
 * by D9 and D11 alone). This engine takes a single `volume` and applies
 * it everywhere D8:D15 appear, so that inconsistency cannot happen.
 *
 * The Excel file itself was last saved with a finance rate of 35%.
 * This engine's application default is 48% (see PROFITABILITY_DEFAULTS
 * below) — the 35% figure is used ONLY in the golden test, to prove
 * this engine reproduces the file bit-for-bit.
 *
 * ZERO-DIVISION CONVENTION (matches src/lib/outcomes/calculations.ts):
 * a percentage with a zero or invalid denominator returns null rather
 * than NaN or Infinity.
 */

/* =========================================================
   INPUTS
========================================================= */

export type ProfitabilityInputs = {
  /** B5 — number of days of credit extended. */
  creditDays: DecimalInput;
  /** C8 — depot price per litre. */
  depotPricePerLitre: DecimalInput;
  /** D8:D15 — order volume, applied consistently everywhere. */
  volume: DecimalInput;
  /** E9 — TOTAL overheads/parking cost (not per litre). */
  totalOverheads: DecimalInput;
  /** E11 — TOTAL trip/loading expenses (not per litre). */
  totalTripExpenses: DecimalInput;
  /** Annualised finance rate, as a whole percentage (48 = 48%). */
  financeRatePercent: DecimalInput;
  /** Operational loss, as a % of depot price (0.5 = 0.5%). */
  operationalLossPercent: DecimalInput;
  /** Target margin, as a % of Total Landing Cost (5 = 5%). */
  targetMarginPercent: DecimalInput;
};

export type ProfitabilityInputsPlain = {
  [K in keyof ProfitabilityInputs]: number;
};

/**
 * Application defaults. These are the STARTING values shown on the
 * page and restored by the Reset button.
 */
export const PROFITABILITY_DEFAULTS: ProfitabilityInputsPlain = {
  creditDays: 7,
  depotPricePerLitre: 1750,
  volume: 20000,
  totalOverheads: 200000,
  totalTripExpenses: 108000,
  financeRatePercent: 48,
  operationalLossPercent: 0.5,
  targetMarginPercent: 5,
};

/**
 * The rate PEDDLER_PROFITAILITY_ANALYSIS.xlsx was last saved with.
 * NOT an app default — used only to verify this engine against the
 * original file. See scripts/test-profitability-calculations.ts.
 */
export const EXCEL_FILE_FINANCE_RATE_PERCENT = 35;

/* =========================================================
   BREAKDOWN (the Excel's C8:C15 / E-column totals)
========================================================= */

export type ProfitabilityLineItem = {
  /** Full-precision value, per litre. */
  perLitre: number;
  /** Full-precision value, for the whole order (perLitre × volume). */
  total: number;
};

export type ProfitabilityBreakdown = {
  depotPrice: ProfitabilityLineItem;
  overheads: ProfitabilityLineItem;
  financeCost: ProfitabilityLineItem;
  tripExpenses: ProfitabilityLineItem;
  operationalLoss: ProfitabilityLineItem;
  /** C13 / SUM(C8:C12) — Total Landing Cost. */
  totalLandingCost: ProfitabilityLineItem;
  /** C14 — margin at the target margin %. */
  margin: ProfitabilityLineItem;
  /** C15 — Recommended LPO Amount (Total Landing Cost + margin). */
  lpoAmount: ProfitabilityLineItem;
};

function lineItem(
  perLitre: ProfitabilityDecimal,
  volume: ProfitabilityDecimal
): ProfitabilityLineItem {
  return {
    perLitre: perLitre.toNumber(),
    total: perLitre.times(volume).toNumber(),
  };
}

export function calculateProfitabilityBreakdown(
  inputs: ProfitabilityInputs
): ProfitabilityBreakdown {
  const creditDays = toProfitabilityDecimal(inputs.creditDays);
  const depotPrice = toProfitabilityDecimal(inputs.depotPricePerLitre);
  const volume = toProfitabilityDecimal(inputs.volume);
  const totalOverheads = toProfitabilityDecimal(inputs.totalOverheads);
  const totalTripExpenses = toProfitabilityDecimal(inputs.totalTripExpenses);
  const financeRatePercent = toProfitabilityDecimal(inputs.financeRatePercent);
  const operationalLossPercent = toProfitabilityDecimal(
    inputs.operationalLossPercent
  );
  const targetMarginPercent = toProfitabilityDecimal(inputs.targetMarginPercent);

  if (volume.lessThanOrEqualTo(0)) {
    throw new RangeError("Profitability volume must be greater than zero.");
  }

  // C9 = E9 / D9
  const overheadsPerLitre = totalOverheads.dividedBy(volume);

  // C10 = C8 * financeRate% / 365 * B5
  const financeCostPerLitre = depotPrice
    .times(financeRatePercent)
    .dividedBy(100)
    .dividedBy(365)
    .times(creditDays);

  // C11 = E11 / D11
  const tripExpensesPerLitre = totalTripExpenses.dividedBy(volume);

  // C12 = C8 * operationalLoss%
  const operationalLossPerLitre = depotPrice
    .times(operationalLossPercent)
    .dividedBy(100);

  // C13 = SUM(C8:C12)
  const totalLandingCostPerLitre = depotPrice
    .plus(overheadsPerLitre)
    .plus(financeCostPerLitre)
    .plus(tripExpensesPerLitre)
    .plus(operationalLossPerLitre);

  // C14 = C13 * targetMargin%
  const marginPerLitre = totalLandingCostPerLitre
    .times(targetMarginPercent)
    .dividedBy(100);

  // C15 = C13 + C14
  const lpoAmountPerLitre = totalLandingCostPerLitre.plus(marginPerLitre);

  return {
    depotPrice: lineItem(depotPrice, volume),
    overheads: lineItem(overheadsPerLitre, volume),
    financeCost: lineItem(financeCostPerLitre, volume),
    tripExpenses: lineItem(tripExpensesPerLitre, volume),
    operationalLoss: lineItem(operationalLossPerLitre, volume),
    totalLandingCost: lineItem(totalLandingCostPerLitre, volume),
    margin: lineItem(marginPerLitre, volume),
    lpoAmount: lineItem(lpoAmountPerLitre, volume),
  };
}

/* =========================================================
   HEALTH BAND
========================================================= */

export type ProfitabilityHealthBand = "red" | "orange" | "yellow" | "green";

export const PROFITABILITY_HEALTH_LABELS: Record<ProfitabilityHealthBand, string> = {
  red: "Loss-making",
  orange: "Below target — weak",
  yellow: "Below target — fair",
  green: "At or above target",
};

/**
 * Bands are relative to the TARGET margin, not fixed numbers, because
 * the target margin is itself editable:
 *
 *   red    : margin % < 0            (an actual loss)
 *   orange : 0 <= margin % < target/2
 *   yellow : target/2 <= margin % < target
 *   green  : margin % >= target
 *
 * At the default 5% target this gives red < 0%, orange 0–2.5%,
 * yellow 2.5–5%, green >= 5%.
 */
/**
 * A price that is mathematically exactly at a boundary (e.g. exactly
 * the target margin) can land a hair below it after Decimal → number
 * conversion, due to IEEE-754 floating point. EPSILON absorbs that
 * without affecting any real business difference — 0.000000001 of a
 * percentage point is not a distinction anyone prices against.
 */
const HEALTH_BAND_EPSILON = 1e-9;

export function getProfitabilityHealthBand(
  marginPercentOfLandingCost: number,
  targetMarginPercent: number
): ProfitabilityHealthBand {
  const halfTarget = targetMarginPercent / 2;

  if (marginPercentOfLandingCost < -HEALTH_BAND_EPSILON) return "red";
  if (marginPercentOfLandingCost < halfTarget - HEALTH_BAND_EPSILON) return "orange";
  if (marginPercentOfLandingCost < targetMarginPercent - HEALTH_BAND_EPSILON) return "yellow";
  return "green";
}

/**
 * The price per litre needed to just reach each band, given a Total
 * Landing Cost per litre and a target margin %. Used to show "you need
 * at least ₦X" and as ARIA's floor prices.
 */
export type ProfitabilityMarginFloors = {
  breakEvenPrice: number; // 0% margin
  fairPrice: number; // target / 2
  targetPrice: number; // full target
};

export function getProfitabilityMarginFloors(
  totalLandingCostPerLitre: DecimalInput,
  targetMarginPercent: DecimalInput
): ProfitabilityMarginFloors {
  const tlc = toProfitabilityDecimal(totalLandingCostPerLitre);
  const target = toProfitabilityDecimal(targetMarginPercent);

  const priceAtMargin = (marginPercent: ProfitabilityDecimal) =>
    tlc.plus(tlc.times(marginPercent).dividedBy(100)).toNumber();

  return {
    breakEvenPrice: tlc.toNumber(),
    fairPrice: priceAtMargin(target.dividedBy(2)),
    targetPrice: priceAtMargin(target),
  };
}

/* =========================================================
   CUSTOMER PRICE EVALUATION
========================================================= */

export type CustomerPriceEvaluation = {
  customerPricePerLitre: number;
  /** Total Landing Cost, echoed here so the UI has one object to read. */
  totalLandingCostPerLitre: number;
  /** customerPrice − Total Landing Cost, per litre. */
  marginAmountPerLitre: number;
  /** (customerPrice − TLC) / TLC × 100. null if TLC is 0. */
  marginPercentOfLandingCost: number | null;
  healthBand: ProfitabilityHealthBand;
  healthLabel: string;
  floors: ProfitabilityMarginFloors;
  totalCustomerRevenue: number;
  totalMarginAmount: number;
};

/**
 * Evaluates a customer's asking price against a breakdown that has
 * already been calculated. Called every time the customer price
 * changes, WITHOUT recalculating the rest of the breakdown — the
 * customer price never feeds back into cost inputs.
 */
export function evaluateCustomerPrice(
  breakdown: ProfitabilityBreakdown,
  customerPricePerLitre: DecimalInput,
  volume: DecimalInput,
  targetMarginPercent: DecimalInput
): CustomerPriceEvaluation {
  const customerPrice = toProfitabilityDecimal(customerPricePerLitre);
  const volumeDecimal = toProfitabilityDecimal(volume);
  const tlc = toProfitabilityDecimal(breakdown.totalLandingCost.perLitre);

  const marginAmountPerLitre = customerPrice.minus(tlc);
  const marginPercentOfLandingCost = tlc.isZero()
    ? null
    : marginAmountPerLitre.dividedBy(tlc).times(100).toNumber();

  const targetMarginNumber = toProfitabilityDecimal(targetMarginPercent).toNumber();

  const healthBand =
    marginPercentOfLandingCost === null
      ? "red"
      : getProfitabilityHealthBand(marginPercentOfLandingCost, targetMarginNumber);

  return {
    customerPricePerLitre: customerPrice.toNumber(),
    totalLandingCostPerLitre: tlc.toNumber(),
    marginAmountPerLitre: marginAmountPerLitre.toNumber(),
    marginPercentOfLandingCost,
    healthBand,
    healthLabel: PROFITABILITY_HEALTH_LABELS[healthBand],
    floors: getProfitabilityMarginFloors(tlc, targetMarginPercent),
    totalCustomerRevenue: customerPrice.times(volumeDecimal).toNumber(),
    totalMarginAmount: marginAmountPerLitre.times(volumeDecimal).toNumber(),
  };
}

/* =========================================================
   DEFAULT FEE FOR CREDIT BUYERS
========================================================= */

export type DefaultFeeResult = {
  ratePercent: number;
  perLitrePerDay: number;
  totalPerDay: number;
};

/**
 * Default fee = (rate / 100) / 365 * price.
 *
 * Uses the SAME finance rate as the Total Landing Cost calculation
 * (financeRatePercent — 48% by default) rather than a second rate, and
 * is applied to the customer price: it is what a credit buyer is
 * charged per day for every day they pay late, on the price they were
 * actually charged.
 */
export function calculateDefaultFee(
  pricePerLitre: DecimalInput,
  financeRatePercent: DecimalInput,
  volume: DecimalInput
): DefaultFeeResult {
  const price = toProfitabilityDecimal(pricePerLitre);
  const rate = toProfitabilityDecimal(financeRatePercent);
  const volumeDecimal = toProfitabilityDecimal(volume);

  const perLitrePerDay = rate.dividedBy(100).dividedBy(365).times(price);

  return {
    ratePercent: rate.toNumber(),
    perLitrePerDay: perLitrePerDay.toNumber(),
    totalPerDay: perLitrePerDay.times(volumeDecimal).toNumber(),
  };
}

/* =========================================================
   ONE-CALL CONVENIENCE WRAPPER
========================================================= */

export type ProfitabilityResult = {
  breakdown: ProfitabilityBreakdown;
  /** The LPO Amount per litre — the suggested STARTING customer price. */
  suggestedCustomerPricePerLitre: number;
  customerPriceEvaluation: CustomerPriceEvaluation;
  defaultFee: DefaultFeeResult;
};

/**
 * Runs the full pipeline in one call: breakdown, then evaluates the
 * given (or suggested) customer price against it, then the default
 * fee. This is what the page and the save/compare actions will call.
 */
export function calculateProfitability(
  inputs: ProfitabilityInputs,
  customerPricePerLitre?: DecimalInput
): ProfitabilityResult {
  const breakdown = calculateProfitabilityBreakdown(inputs);
  const suggestedCustomerPricePerLitre = breakdown.lpoAmount.perLitre;

  const priceToEvaluate = customerPricePerLitre ?? suggestedCustomerPricePerLitre;

  const customerPriceEvaluation = evaluateCustomerPrice(
    breakdown,
    priceToEvaluate,
    inputs.volume,
    inputs.targetMarginPercent
  );

  const defaultFee = calculateDefaultFee(
    priceToEvaluate,
    inputs.financeRatePercent,
    inputs.volume
  );

  return {
    breakdown,
    suggestedCustomerPricePerLitre,
    customerPriceEvaluation,
    defaultFee,
  };
}