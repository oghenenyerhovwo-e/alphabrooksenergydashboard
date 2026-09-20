"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  useFormState,
  useFormStatus,
} from "react-dom";

import { Prisma } from "@/generated/prisma/browser";

import {
  saveOutcomeAchievementAction,
  type OutcomeAchievementActionState,
} from "@/lib/outcomes/actions";

import styles from "./OutcomeAchievementEntry.module.css";

interface OutcomeAchievementEntryProps {
  year: number;
  month: number;
  product: string;
  unit: string | null;
  hasTarget: boolean;
  existingAchievement: {
    achievedQuantity: number | null;
    achievedMarginPerUnit: number | null;
    achievedGeneratedValue: number | null;
    unit: string;
  } | null;
}

const initialState: OutcomeAchievementActionState = {};

function formatPreviewValue(
  value: string
): string {
  const trimmed = value.trim();

  if (!trimmed) {
    return "0.00";
  }

  try {
    return new Prisma.Decimal(
      trimmed
    ).toFixed(2);
  } catch {
    return "0.00";
  }
}

/*
 * Presentation-only preview.
 *
 * The authoritative calculation remains the Phase 2
 * server-side deriveOutcomeValue() used by the action.
 */
function calculatePreview(
  quantity: string,
  marginPerUnit: string
): string {
  const quantityValue =
    quantity.trim();

  const marginValue =
    marginPerUnit.trim();

  if (
    !quantityValue ||
    !marginValue
  ) {
    return "0.00";
  }

  try {
    return new Prisma.Decimal(
      quantityValue
    )
      .mul(
        new Prisma.Decimal(
          marginValue
        )
      )
      .toFixed(2);
  } catch {
    return "0.00";
  }
}

function SubmitButton() {
  const { pending } =
    useFormStatus();

  return (
    <button
      type="submit"
      className={styles.submitButton}
      disabled={pending}
    >
      {pending
        ? "Saving achievement…"
        : "Save achievement"}
    </button>
  );
}

export function OutcomeAchievementEntry({
  year,
  month,
  product,
  unit,
  hasTarget,
  existingAchievement,
}: OutcomeAchievementEntryProps) {
  const [state, formAction] =
    useFormState(
      saveOutcomeAchievementAction,
      initialState
    );

  const [quantity, setQuantity] =
    useState(
      existingAchievement?.achievedQuantity !==
        null &&
        existingAchievement?.achievedQuantity !==
          undefined
        ? String(
            existingAchievement.achievedQuantity
          )
        : ""
    );

  const [marginPerUnit, setMarginPerUnit] =
    useState(
      existingAchievement?.achievedMarginPerUnit !==
        null &&
        existingAchievement?.achievedMarginPerUnit !==
          undefined
        ? String(
            existingAchievement.achievedMarginPerUnit
          )
        : ""
    );

  const [submittedSuccessfully, setSubmittedSuccessfully] =
    useState(false);

  const previousSuccess =
    useRef(false);

  useEffect(() => {
    if (
      state.success &&
      !previousSuccess.current
    ) {
      setSubmittedSuccessfully(true);
    }

    previousSuccess.current =
      Boolean(state.success);
  }, [state.success]);

  const previewValue =
    useMemo(
      () =>
        calculatePreview(
          quantity,
          marginPerUnit
        ),
      [
        quantity,
        marginPerUnit,
      ]
    );

  const displayedUnit =
    unit ?? "—";

  const quantityError =
    state.fieldErrors?.quantity;

  const marginError =
    state.fieldErrors?.marginPerUnit;

  const unitError =
    state.fieldErrors?.unit;

  const disabled =
    !hasTarget ||
    !unit;

  return (
    <section
      className={styles.panel}
      aria-labelledby="achievement-entry-title"
    >
      <div className={styles.header}>
        <div>
          <div className={styles.eyebrow}>
            STAFF ENTRY
          </div>

          <h2
            id="achievement-entry-title"
            className={styles.title}
          >
            Record your achievement
          </h2>

          <p className={styles.description}>
            Enter the actual output achieved for
            the selected reporting period. Your
            authenticated account is used
            automatically.
          </p>
        </div>

        <div className={styles.periodBadge}>
          <span>
            {product}
          </span>

          <strong>
            {displayedUnit}
          </strong>
        </div>
      </div>

      {!hasTarget && (
        <div
          className={styles.notice}
          role="status"
        >
          <strong>
            Target required
          </strong>

          <span>
            A target has not been configured for
            you for this period. Please contact an
            Administrator before recording an
            achievement.
          </span>
        </div>
      )}

      {hasTarget && (
        <form
          action={formAction}
          className={styles.form}
        >
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

          <div className={styles.fields}>
            <div className={styles.field}>
              <label
                htmlFor="achievement-quantity"
              >
                Actual quantity
              </label>

              <div
                className={
                  styles.inputWithUnit
                }
              >
                <input
                  id="achievement-quantity"
                  name="quantity"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={quantity}
                  onChange={(event) => {
                    setQuantity(
                      event.target.value
                    );
                    setSubmittedSuccessfully(
                      false
                    );
                  }}
                  aria-invalid={
                    Boolean(quantityError)
                  }
                  aria-describedby={
                    quantityError
                      ? "achievement-quantity-error"
                      : "achievement-quantity-help"
                  }
                  disabled={disabled}
                  placeholder="0.00"
                />

                <span
                  className={styles.unit}
                >
                  {displayedUnit}
                </span>
              </div>

              {quantityError ? (
                <p
                  id="achievement-quantity-error"
                  className={styles.fieldError}
                >
                  {quantityError}
                </p>
              ) : (
                <p
                  id="achievement-quantity-help"
                  className={styles.help}
                >
                  Zero is a valid achievement.
                </p>
              )}
            </div>

            <div className={styles.field}>
              <label
                htmlFor="achievement-margin"
              >
                Actual margin per unit
              </label>

              <input
                id="achievement-margin"
                name="marginPerUnit"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={marginPerUnit}
                onChange={(event) => {
                  setMarginPerUnit(
                    event.target.value
                  );
                  setSubmittedSuccessfully(
                    false
                  );
                }}
                aria-invalid={
                  Boolean(marginError)
                }
                aria-describedby={
                  marginError
                    ? "achievement-margin-error"
                    : "achievement-margin-help"
                }
                disabled={disabled}
                placeholder="0.00"
              />

              {marginError ? (
                <p
                  id="achievement-margin-error"
                  className={styles.fieldError}
                >
                  {marginError}
                </p>
              ) : (
                <p
                  id="achievement-margin-help"
                  className={styles.help}
                >
                  Enter the actual margin generated
                  per unit.
                </p>
              )}
            </div>
          </div>

          <div
            className={styles.preview}
            aria-live="polite"
          >
            <div>
              <span className={styles.previewLabel}>
                Generated value preview
              </span>

              <strong
                className={styles.previewValue}
              >
                {formatPreviewValue(
                  previewValue
                )}
              </strong>
            </div>

            <p>
              Calculated as actual quantity ×
              actual margin per unit. The server
              recalculates the authoritative value
              when you save.
            </p>
          </div>

          {unitError && (
            <p
              className={styles.formError}
              role="alert"
            >
              {unitError}
            </p>
          )}

          {state.error && (
            <p
              className={styles.formError}
              role="alert"
            >
              {state.error}
            </p>
          )}

          {submittedSuccessfully &&
            state.success && (
              <p
                className={styles.success}
                role="status"
              >
                Achievement saved successfully.
              </p>
            )}

          <div className={styles.footer}>
            <div className={styles.footerNote}>
              <span>
                {existingAchievement
                  ? "Editing your saved achievement"
                  : "No achievement has been recorded yet"}
              </span>

              <small>
                {year} · {month} · {product}
              </small>
            </div>

            <SubmitButton />
          </div>
        </form>
      )}
    </section>
  );
}