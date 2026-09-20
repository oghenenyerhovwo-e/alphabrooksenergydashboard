"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useState,
} from "react";
import type {
  OutcomeProduct,
  OutcomeUnit,
  User,
} from "@/generated/prisma/client";

import {
  OUTCOME_PRODUCT_ALLOWED_UNITS,
} from "@/config/outcomeProducts";

import {
  deriveOutcomeValue,
} from "@/lib/outcomes/calculations";

import {
  saveOutcomeTargetsAction,
  type OutcomeTargetActionState,
} from "@/lib/outcomes/actions";

import styles from "./OutcomeTargetConsole.module.css";

interface EligibleStaffMember
  extends Pick<User, "id" | "name" | "role"> {}

interface TargetWithStaff {
  userId: string;
  targetQuantity: number;
  targetMarginPerUnit: number | null;
  targetValue: number;
  unit: OutcomeUnit;
}

interface OutcomeTargetConsoleProps {
  year: number;
  month: number;
  product: OutcomeProduct;
  staff: EligibleStaffMember[];
  existingTargets: TargetWithStaff[];
}

interface DraftTarget {
  quantity: string;
  margin: string;
  unit: OutcomeUnit;
}

const initialState: OutcomeTargetActionState = {};

function formatExistingValue(
  value: number | null | undefined
): string {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value);
}

function formatNumberForDisplay(
  value: string
): string {
  const numericValue = Number(value);

  if (
    !Number.isFinite(numericValue)
  ) {
    return value;
  }

  return new Intl.NumberFormat(
    "en-NG",
    {
      maximumFractionDigits: 3,
    }
  ).format(numericValue);
}

function formatMoney(
  value: ReturnType<typeof deriveOutcomeValue>
): string {
  const numericValue = value.toNumber();

  return new Intl.NumberFormat(
    "en-NG",
    {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 2,
    }
  ).format(numericValue);
}

function getUnitLabel(
  unit: OutcomeUnit
): string {
  switch (unit) {
    case "LITRES":
      return "Litres";

    case "SCM":
      return "SCM";

    case "KG":
      return "Kg";

    case "TONNES":
      return "Tonnes";

    default:
      return unit;
  }
}

function getUnitShortLabel(
  unit: OutcomeUnit
): string {
  switch (unit) {
    case "LITRES":
      return "L";

    case "SCM":
      return "SCM";

    case "KG":
      return "kg";

    case "TONNES":
      return "t";

    default:
      return unit;
  }
}

function isValidPreviewInput(
  value: string
): boolean {
  if (value.trim() === "") {
    return false;
  }

  const numericValue = Number(value);

  return (
    Number.isFinite(numericValue) &&
    numericValue >= 0
  );
}

function calculatePreview(
  quantity: string,
  margin: string
): ReturnType<typeof deriveOutcomeValue> | null {
  /*
   * Empty values do not represent a configured target.
   *
   * Zero is intentionally different from empty:
   * 0 × 80 = 0 is a valid preview.
   */
  if (
    !isValidPreviewInput(quantity) ||
    !isValidPreviewInput(margin)
  ) {
    return null;
  }

  try {
    return deriveOutcomeValue(
      quantity,
      margin
    );
  } catch {
    return null;
  }
}

export function OutcomeTargetConsole({
  year,
  month,
  product,
  staff,
  existingTargets,
}: OutcomeTargetConsoleProps) {
  const [
    state,
    formAction,
    isPending,
  ] = useActionState(
    saveOutcomeTargetsAction,
    initialState
  );

  const [
    savedNoticeVisible,
    setSavedNoticeVisible,
  ] = useState(false);

  const targetMap = useMemo(
    () =>
      new Map(
        existingTargets.map(
          (target) => [
            target.userId,
            target,
          ]
        )
      ),
    [existingTargets]
  );

  const [
    drafts,
    setDrafts,
  ] = useState<
    Record<string, DraftTarget>
  >({});

  useEffect(() => {
    const nextDrafts: Record<
      string,
      DraftTarget
    > = {};

    for (const member of staff) {
      const existing =
        targetMap.get(member.id);

      const configuredUnits =
        OUTCOME_PRODUCT_ALLOWED_UNITS[
          product
        ];

      const defaultUnit =
        existing?.unit ??
        configuredUnits[0];

      if (!defaultUnit) {
        continue;
      }

      nextDrafts[member.id] = {
        quantity:
          existing
            ? formatExistingValue(
                existing.targetQuantity
              )
            : "",
        margin:
          existing &&
          existing.targetMarginPerUnit !== null
            ? formatExistingValue(
                existing.targetMarginPerUnit
              )
            : "",
        unit: defaultUnit,
      };
    }

    setDrafts(nextDrafts);
  }, [
    existingTargets,
    product,
    staff,
    targetMap,
  ]);

  useEffect(() => {
    if (!state.success) {
      return;
    }

    setSavedNoticeVisible(true);

    const timer =
      window.setTimeout(() => {
        setSavedNoticeVisible(false);
      }, 4500);

    return () =>
      window.clearTimeout(timer);
  }, [state.success]);

  function updateDraft(
    userId: string,
    field: keyof DraftTarget,
    value: string | OutcomeUnit
  ) {
    setDrafts((current) => ({
      ...current,
      [userId]: {
        ...(current[userId] ?? {
          quantity: "",
          margin: "",
          unit:
            OUTCOME_PRODUCT_ALLOWED_UNITS[
              product
            ][0],
        }),
        [field]: value,
      } as DraftTarget,
    }));
  }

  return (
    <section className={styles.console}>
      <div className={styles.consoleHeader}>
        <div className={styles.headerCopy}>
          <div className={styles.eyebrow}>
            ADMIN CONTROL
          </div>

          <h2>
            Monthly Targets
          </h2>

          <p>
            Set the expected measurable output
            and margin per unit for each eligible
            staff member. The generated target
            value is calculated automatically from
            those inputs.
          </p>
        </div>

        <div
          className={styles.periodSummary}
        >
          <span>
            Target period
          </span>

          <strong>
            {monthName(month)} {year}
          </strong>

          <small>
            {product}
          </small>
        </div>
      </div>

      {state.error && (
        <div
          className={styles.error}
          role="alert"
        >
          <span
            className={styles.errorIcon}
            aria-hidden="true"
          >
            !
          </span>

          <div>
            <strong>
              Unable to save targets
            </strong>

            <p>
              {state.error}
            </p>
          </div>
        </div>
      )}

      {savedNoticeVisible && (
        <div
          className={styles.success}
          role="status"
        >
          <span
            className={styles.successIcon}
            aria-hidden="true"
          >
            ✓
          </span>

          <div>
            <strong>
              Targets saved
            </strong>

            <p>
              The {product} targets for{" "}
              {monthName(month)} {year} have
              been updated successfully.
            </p>
          </div>
        </div>
      )}

      <form action={formAction}>
        <input
          type="hidden"
          name="year"
          value={year}
        />

        <input
          type="hidden"
          name="month"
          value={month}
        />

        <input
          type="hidden"
          name="product"
          value={product}
        />

        <div className={styles.tableHeader}>
          <div>
            <span>
              Staff member
            </span>
          </div>

          <div>
            <span>
              Target quantity
            </span>
          </div>

          <div>
            <span>
              Margin / unit
            </span>
          </div>

          <div>
            <span>
              Measurement
            </span>
          </div>

          <div>
            <span>
              Calculated target value
            </span>
          </div>
        </div>

        <div className={styles.staffList}>
          {staff.map(
            (member, index) => {
              const existing =
                targetMap.get(
                  member.id
                );

              const draft =
                drafts[member.id] ?? {
                  quantity:
                    existing
                      ? formatExistingValue(
                          existing.targetQuantity
                        )
                      : "",
                  margin:
                    existing &&
                    existing.targetMarginPerUnit !==
                      null
                      ? formatExistingValue(
                          existing.targetMarginPerUnit
                        )
                      : "",
                  unit:
                    existing?.unit ??
                    OUTCOME_PRODUCT_ALLOWED_UNITS[
                      product
                    ][0],
                };

              const targetError =
                state.fieldErrors?.[
                  `target-${member.id}`
                ];

              const marginError =
                state.fieldErrors?.[
                  `margin-${member.id}`
                ];

              const unitError =
                state.fieldErrors?.[
                  `unit-${member.id}`
                ];

              const preview =
                calculatePreview(
                  draft.quantity,
                  draft.margin
                );

              const unitShort =
                getUnitShortLabel(
                  draft.unit
                );

              const unitLabel =
                getUnitLabel(
                  draft.unit
                );

              return (
                <div
                  key={member.id}
                  className={styles.staffRow}
                >
                  <div
                    className={
                      styles.staffIdentity
                    }
                  >
                    <div
                      className={
                        styles.staffNumber
                      }
                    >
                      {String(
                        index + 1
                      ).padStart(2, "0")}
                    </div>

                    <div>
                      <strong>
                        {member.name}
                      </strong>

                      <span>
                        {formatRole(
                          member.role
                        )}
                      </span>
                    </div>
                  </div>

                  <div
                    className={
                      styles.quantityField
                    }
                  >
                    <label
                      className={
                        styles.mobileFieldLabel
                      }
                      htmlFor={`target-${member.id}`}
                    >
                      Target quantity
                    </label>

                    <input
                      id={`target-${member.id}`}
                      name={`target-${member.id}`}
                      type="number"
                      min="0"
                      step="0.001"
                      inputMode="decimal"
                      value={
                        draft.quantity
                      }
                      onChange={(event) =>
                        updateDraft(
                          member.id,
                          "quantity",
                          event.target.value
                        )
                      }
                      placeholder="Enter quantity"
                      aria-label={`Target quantity for ${member.name}`}
                      aria-describedby={
                        targetError
                          ? `target-error-${member.id}`
                          : undefined
                      }
                      aria-invalid={
                        targetError
                          ? true
                          : undefined
                      }
                      className={`${styles.quantityInput} ${
                        targetError
                          ? styles.inputError
                          : ""
                      }`}
                    />

                    {targetError && (
                      <span
                        id={`target-error-${member.id}`}
                        className={
                          styles.fieldError
                        }
                      >
                        {targetError}
                      </span>
                    )}
                  </div>

                  <div
                    className={
                      styles.marginField
                    }
                  >
                    <label
                      className={
                        styles.mobileFieldLabel
                      }
                      htmlFor={`margin-${member.id}`}
                    >
                      Margin per {unitShort}
                    </label>

                    <input
                      id={`margin-${member.id}`}
                      name={`margin-${member.id}`}
                      type="number"
                      min="0"
                      step="0.0001"
                      inputMode="decimal"
                      value={
                        draft.margin
                      }
                      onChange={(event) =>
                        updateDraft(
                          member.id,
                          "margin",
                          event.target.value
                        )
                      }
                      placeholder="e.g. 80"
                      aria-label={`Margin per ${unitLabel} for ${member.name}`}
                      aria-describedby={
                        marginError
                          ? `margin-error-${member.id}`
                          : undefined
                      }
                      aria-invalid={
                        marginError
                          ? true
                          : undefined
                      }
                      className={`${styles.quantityInput} ${
                        marginError
                          ? styles.inputError
                          : ""
                      }`}
                    />

                    {marginError && (
                      <span
                        id={`margin-error-${member.id}`}
                        className={
                          styles.fieldError
                        }
                      >
                        {marginError}
                      </span>
                    )}
                  </div>

                  <div
                    className={
                      styles.unitField
                    }
                  >
                    <label
                      className={
                        styles.mobileFieldLabel
                      }
                      htmlFor={`unit-${member.id}`}
                    >
                      Measurement
                    </label>

                    <select
                      id={`unit-${member.id}`}
                      name={`unit-${member.id}`}
                      value={draft.unit}
                      onChange={(event) =>
                        updateDraft(
                          member.id,
                          "unit",
                          event.target
                            .value as OutcomeUnit
                        )
                      }
                      aria-label={`Measurement unit for ${member.name}`}
                      aria-describedby={
                        unitError
                          ? `unit-error-${member.id}`
                          : undefined
                      }
                      aria-invalid={
                        unitError
                          ? true
                          : undefined
                      }
                      className={`${styles.unitSelect} ${
                        unitError
                          ? styles.inputError
                          : ""
                      }`}
                    >
                      {OUTCOME_PRODUCT_ALLOWED_UNITS[
                        product
                      ].map(
                        (unit) => (
                          <option
                            key={unit}
                            value={unit}
                          >
                            {getUnitLabel(
                              unit
                            )}
                          </option>
                        )
                      )}
                    </select>

                    {unitError && (
                      <span
                        id={`unit-error-${member.id}`}
                        className={
                          styles.fieldError
                        }
                      >
                        {unitError}
                      </span>
                    )}
                  </div>

                  <div
                    className={
                      styles.previewField
                    }
                  >
                    <span
                      className={
                        styles.mobileFieldLabel
                      }
                    >
                      Calculated target value
                    </span>

                    {preview !== null ? (
                      <>
                        <strong
                          className={
                            styles.previewValue
                          }
                        >
                          {formatMoney(
                            preview
                          )}
                        </strong>

                        <span
                          className={
                            styles.previewEquation
                          }
                        >
                          {formatNumberForDisplay(
                            draft.quantity
                          )}{" "}
                          {unitShort} × ₦
                          {formatNumberForDisplay(
                            draft.margin
                          )}
                          /{unitShort} ={" "}
                          {formatMoney(
                            preview
                          )}
                        </span>
                      </>
                    ) : (
                      <span
                        className={
                          styles.previewEmpty
                        }
                      >
                        Enter quantity and
                        margin to calculate
                      </span>
                    )}
                  </div>
                </div>
              );
            }
          )}
        </div>

        <div
          className={
            styles.consoleFooter
          }
        >
          <div
            className={
              styles.footerNote
            }
          >
            <span
              className={
                styles.lockMark
              }
              aria-hidden="true"
            >
              ●
            </span>

            <p>
              Only Administrators can change
              monthly targets. Blank rows are
              left unconfigured and do not create
              zero-value targets. The calculated
              target value shown above is a
              preview; the server recalculates the
              authoritative value when saved.
            </p>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className={
              styles.saveButton
            }
          >
            <span>
              {isPending
                ? "Saving targets…"
                : "Save monthly targets"}
            </span>

            {!isPending && (
              <span
                className={
                  styles.buttonArrow
                }
                aria-hidden="true"
              >
                →
              </span>
            )}
          </button>
        </div>
      </form>
    </section>
  );
}

function monthName(
  month: number
): string {
  return [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ][month - 1] ?? "Unknown month";
}

function formatRole(
  role: string
): string {
  return role
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}