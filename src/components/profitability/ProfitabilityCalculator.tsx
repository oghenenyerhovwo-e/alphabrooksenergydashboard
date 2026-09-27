"use client";

import { useMemo, useState } from "react";

import {
  calculateProfitabilityBreakdown,
  evaluateCustomerPrice,
  calculateDefaultFee,
  PROFITABILITY_DEFAULTS,
  EXCEL_FILE_FINANCE_RATE_PERCENT,
  type ProfitabilityInputsPlain,
  type ProfitabilityBreakdown,
} from "@/lib/profitability/calculations";
import { ProfitabilityHealthBar } from "./ProfitabilityHealthBar";
import styles from "./ProfitabilityCalculator.module.css";

type InputKey = keyof ProfitabilityInputsPlain;

/** All eight app-default values, as strings, for the controlled inputs. */
const DEFAULT_RAW_INPUTS: Record<InputKey, string> = Object.fromEntries(
  (Object.keys(PROFITABILITY_DEFAULTS) as InputKey[]).map((key) => [
    key,
    String(PROFITABILITY_DEFAULTS[key]),
  ])
) as Record<InputKey, string>;

const CORE_FIELDS: Array<{
  key: InputKey;
  label: string;
  cell: string;
  prefix?: string;
  step: string;
}> = [
  { key: "creditDays", label: "Credit Days", cell: "B5", step: "1" },
  {
    key: "depotPricePerLitre",
    label: "Depot Price / Litre",
    cell: "C8",
    prefix: "₦",
    step: "0.01",
  },
  {
    key: "volume",
    label: "Volume (Litres)",
    cell: "D8:D15",
    step: "1",
  },
  {
    key: "totalOverheads",
    label: "Total Overheads & Parking",
    cell: "E9",
    prefix: "₦",
    step: "0.01",
  },
  {
    key: "totalTripExpenses",
    label: "Total Trip / Loading Expenses",
    cell: "E11",
    prefix: "₦",
    step: "0.01",
  },
];

const RATE_FIELDS: Array<{
  key: InputKey;
  label: string;
  hint?: string;
  step: string;
}> = [
  {
    key: "financeRatePercent",
    label: "Finance Rate",
    hint: `Excel file was saved at ${EXCEL_FILE_FINANCE_RATE_PERCENT}%`,
    step: "0.1",
  },
  {
    key: "operationalLossPercent",
    label: "Operational Loss",
    step: "0.01",
  },
  {
    key: "targetMarginPercent",
    label: "Target Margin",
    step: "0.1",
  },
];

type BreakdownRowKey = keyof Pick<
  ProfitabilityBreakdown,
  | "depotPrice"
  | "overheads"
  | "financeCost"
  | "tripExpenses"
  | "operationalLoss"
>;

const BREAKDOWN_ROWS: Array<{
  key: BreakdownRowKey;
  label: string;
  cell: string;
}> = [
  { key: "depotPrice", label: "Depot Price", cell: "C8" },
  { key: "overheads", label: "Overheads / Litre", cell: "C9" },
  { key: "financeCost", label: "Finance Cost / Litre", cell: "C10" },
  { key: "tripExpenses", label: "Trip Expenses / Litre", cell: "C11" },
  {
    key: "operationalLoss",
    label: "Operational Loss / Litre",
    cell: "C12",
  },
];

function formatNaira(value: number): string {
  if (!Number.isFinite(value)) return "—";

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number | null, digits = 2): string {
  if (value === null || !Number.isFinite(value)) return "—";

  return `${value.toFixed(digits)}%`;
}

export function ProfitabilityCalculator() {
  const [rawInputs, setRawInputs] = useState<Record<InputKey, string>>(
    DEFAULT_RAW_INPUTS
  );

  /**
   * null = "following the suggested LPO Amount". Once the user types a
   * value, this holds the raw text of their own price instead.
   */
  const [customerPriceRaw, setCustomerPriceRaw] = useState<string | null>(
    null
  );

  function updateField(key: InputKey, value: string) {
    setRawInputs((current) => ({ ...current, [key]: value }));
  }

  function handleReset() {
    setRawInputs(DEFAULT_RAW_INPUTS);
    setCustomerPriceRaw(null);
  }

  const numericInputs = useMemo<ProfitabilityInputsPlain>(() => {
    const result = {} as ProfitabilityInputsPlain;

    (Object.keys(DEFAULT_RAW_INPUTS) as InputKey[]).forEach((key) => {
      const parsed = Number(rawInputs[key]);
      result[key] = Number.isFinite(parsed) ? parsed : 0;
    });

    return result;
  }, [rawInputs]);

  const { breakdown, error } = useMemo(() => {
    try {
      return {
        breakdown: calculateProfitabilityBreakdown(numericInputs),
        error: null as string | null,
      };
    } catch (err) {
      return {
        breakdown: null,
        error:
          err instanceof RangeError
            ? err.message
            : "Could not calculate a result from these numbers.",
      };
    }
  }, [numericInputs]);

  const suggestedPrice = breakdown?.lpoAmount.perLitre ?? 0;

  const isCustomerPriceOverridden =
    customerPriceRaw !== null && customerPriceRaw.trim() !== "";

  const customerPriceNumeric = isCustomerPriceOverridden
    ? Number(customerPriceRaw)
    : suggestedPrice;

  const effectiveCustomerPrice = Number.isFinite(customerPriceNumeric)
    ? customerPriceNumeric
    : suggestedPrice;

  const evaluation =
    breakdown !== null
      ? evaluateCustomerPrice(
          breakdown,
          effectiveCustomerPrice,
          numericInputs.volume,
          numericInputs.targetMarginPercent
        )
      : null;

  const defaultFee =
    breakdown !== null
      ? calculateDefaultFee(
          effectiveCustomerPrice,
          numericInputs.financeRatePercent,
          numericInputs.volume
        )
      : null;

  return (
    <div className={styles.grid}>
      {/* ===== INPUTS ===== */}
      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Order Figures</h2>

          <button
            type="button"
            className={styles.resetButton}
            onClick={handleReset}
          >
            Reset
          </button>
        </div>

        <div className={styles.fieldList}>
          {CORE_FIELDS.map((field) => (
            <label key={field.key} className={styles.field}>
              <span className={styles.fieldLabel}>
                {field.label}
                <span className={styles.cellTag}>{field.cell}</span>
              </span>

              <div className={styles.fieldInputWrap}>
                {field.prefix && (
                  <span className={styles.fieldPrefix}>{field.prefix}</span>
                )}

                <input
                  type="number"
                  inputMode="decimal"
                  step={field.step}
                  className={styles.fieldInput}
                  value={rawInputs[field.key]}
                  onChange={(e) =>
                    updateField(field.key, e.target.value)
                  }
                />
              </div>
            </label>
          ))}
        </div>

        <h2 className={styles.cardTitleSecondary}>Rates</h2>

        <div className={styles.fieldList}>
          {RATE_FIELDS.map((field) => (
            <label key={field.key} className={styles.field}>
              <span className={styles.fieldLabel}>{field.label}</span>

              <div className={styles.fieldInputWrap}>
                <input
                  type="number"
                  inputMode="decimal"
                  step={field.step}
                  className={styles.fieldInput}
                  value={rawInputs[field.key]}
                  onChange={(e) =>
                    updateField(field.key, e.target.value)
                  }
                />

                <span className={styles.fieldSuffix}>%</span>
              </div>

              {field.hint && (
                <span className={styles.fieldHint}>{field.hint}</span>
              )}
            </label>
          ))}
        </div>

        {error && <div className={styles.errorBanner}>{error}</div>}
      </section>

      {/* ===== BREAKDOWN + CUSTOMER PRICE ===== */}
      <div className={styles.resultsColumn}>
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Landing Cost Breakdown</h2>
          </div>

          <table className={styles.table}>
            <thead>
              <tr>
                <th>Line</th>
                <th className={styles.numCol}>Per Litre</th>
                <th className={styles.numCol}>
                  Total ({numericInputs.volume.toLocaleString()} L)
                </th>
              </tr>
            </thead>

            <tbody>
              {BREAKDOWN_ROWS.map((row) => (
                <tr key={row.key}>
                  <td>
                    {row.label}{" "}
                    <span className={styles.cellTag}>{row.cell}</span>
                  </td>

                  <td className={styles.numCol}>
                    {formatNaira(
                      breakdown?.[row.key]?.perLitre ?? NaN
                    )}
                  </td>

                  <td className={styles.numCol}>
                    {formatNaira(
                      breakdown?.[row.key]?.total ?? NaN
                    )}
                  </td>
                </tr>
              ))}

              <tr className={styles.summaryRow}>
                <td>
                  Total Landing Cost{" "}
                  <span className={styles.cellTag}>C13</span>
                </td>

                <td className={styles.numCol}>
                  {formatNaira(
                    breakdown?.totalLandingCost.perLitre ?? NaN
                  )}
                </td>

                <td className={styles.numCol}>
                  {formatNaira(
                    breakdown?.totalLandingCost.total ?? NaN
                  )}
                </td>
              </tr>

              <tr>
                <td>
                  Margin @ {numericInputs.targetMarginPercent}% TLC{" "}
                  <span className={styles.cellTag}>C14</span>
                </td>

                <td className={styles.numCol}>
                  {formatNaira(breakdown?.margin.perLitre ?? NaN)}
                </td>

                <td className={styles.numCol}>
                  {formatNaira(breakdown?.margin.total ?? NaN)}
                </td>
              </tr>

              <tr className={styles.summaryRow}>
                <td>
                  Recommended LPO Amount{" "}
                  <span className={styles.cellTag}>C15</span>
                </td>

                <td className={styles.numCol}>
                  {formatNaira(breakdown?.lpoAmount.perLitre ?? NaN)}
                </td>

                <td className={styles.numCol}>
                  {formatNaira(breakdown?.lpoAmount.total ?? NaN)}
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Customer Price</h2>
            {isCustomerPriceOverridden && (
              <button
                type="button"
                className={styles.linkButton}
                onClick={() => setCustomerPriceRaw(null)}
              >
                Reset to LPO Amount
              </button>
            )}
          </div>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>
              Customer Price / Litre
              <span className={styles.followBadge}>
                {isCustomerPriceOverridden ? "Custom" : "Following LPO Amount"}
              </span>
            </span>
            <div className={styles.fieldInputWrap}>
              <span className={styles.fieldPrefix}>₦</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                className={styles.fieldInput}
                value={
                  isCustomerPriceOverridden
                    ? customerPriceRaw ?? ""
                    : suggestedPrice.toFixed(2)
                }
                onChange={(e) => setCustomerPriceRaw(e.target.value)}
              />
            </div>
          </label>

          {evaluation && (
            <ProfitabilityHealthBar
              marginPercentOfLandingCost={evaluation.marginPercentOfLandingCost}
              targetMarginPercent={numericInputs.targetMarginPercent}
              band={evaluation.healthBand}
            />
          )}

          <div className={styles.statRow}>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Margin / Litre</span>
              <span className={styles.statValue}>
                {formatNaira(evaluation?.marginAmountPerLitre ?? NaN)}
              </span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Break-even Price</span>
              <span className={styles.statValue}>
                {formatNaira(evaluation?.floors.breakEvenPrice ?? NaN)}
              </span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Target Price</span>
              <span className={styles.statValue}>
                {formatNaira(evaluation?.floors.targetPrice ?? NaN)}
              </span>
            </div>
          </div>

          <div className={styles.statRow}>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Total Customer Revenue</span>
              <span className={styles.statValue}>
                {formatNaira(evaluation?.totalCustomerRevenue ?? NaN)}
              </span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Total Margin</span>
              <span className={styles.statValue}>
                {formatNaira(evaluation?.totalMarginAmount ?? NaN)}
              </span>
            </div>
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Default Fee — Credit Buyers</h2>
          </div>
          <p className={styles.helperText}>
            Charged per litre for each day a credit customer pays after the
            agreed credit days, at the finance rate above.
          </p>

          {evaluation?.healthBand === "red" && (
            <div className={styles.warningBanner}>
              This price is already below Total Landing Cost. A late-payment
              fee does not make a loss-making price profitable — it only
              charges for the delay.
            </div>
          )}

          <div className={styles.statRow}>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Per Litre / Day</span>
              <span className={styles.statValue}>
                {formatNaira(defaultFee?.perLitrePerDay ?? NaN)}
              </span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Total / Day</span>
              <span className={styles.statValue}>
                {formatNaira(defaultFee?.totalPerDay ?? NaN)}
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}