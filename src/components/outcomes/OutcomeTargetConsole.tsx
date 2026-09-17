"use client";

import { useActionState, useEffect, useState } from "react";
import type {
  OutcomeProduct,
  OutcomeTarget,
  OutcomeUnit,
  User,
} from "@/generated/prisma/client";
import {
  saveOutcomeTargetsAction,
  type OutcomeTargetActionState,
} from "@/lib/outcomes/actions";
import styles from "./OutcomeTargetConsole.module.css";

interface EligibleStaffMember
  extends Pick<User, "id" | "name" | "role"> {}

interface TargetWithStaff {
  userId: string;
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

const initialState: OutcomeTargetActionState = {};

const AGO_UNITS: Array<{
  value: OutcomeUnit;
  label: string;
}> = [
  {
    value: "LITRES",
    label: "Litres",
  },
];

function formatExistingValue(
  value: TargetWithStaff["targetValue"]
): string {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

export function OutcomeTargetConsole({
  year,
  month,
  product,
  staff,
  existingTargets,
}: OutcomeTargetConsoleProps) {
  const [state, formAction, isPending] = useActionState(
    saveOutcomeTargetsAction,
    initialState
  );

  const [savedNoticeVisible, setSavedNoticeVisible] =
    useState(false);

  const targetMap = new Map(
    existingTargets.map((target) => [
      target.userId,
      target,
    ])
  );

  useEffect(() => {
    if (!state.success) return;

    setSavedNoticeVisible(true);

    const timer = window.setTimeout(() => {
      setSavedNoticeVisible(false);
    }, 4500);

    return () => window.clearTimeout(timer);
  }, [state.success]);

  return (
    <section className={styles.console}>
      <div className={styles.consoleHeader}>
        <div className={styles.headerCopy}>
          <div className={styles.eyebrow}>
            ADMIN CONTROL
          </div>

          <h2>Monthly Targets</h2>

          <p>
            Set the expected measurable output for each eligible
            staff member. Targets can be edited at any time for
            this reporting month.
          </p>
        </div>

        <div className={styles.periodSummary}>
          <span>Target period</span>

          <strong>
            {monthName(month)} {year}
          </strong>

          <small>{product}</small>
        </div>
      </div>

      {state.error && (
        <div
          className={styles.error}
          role="alert"
        >
          <span className={styles.errorIcon}>!</span>

          <div>
            <strong>Unable to save targets</strong>
            <p>{state.error}</p>
          </div>
        </div>
      )}

      {savedNoticeVisible && (
        <div
          className={styles.success}
          role="status"
        >
          <span className={styles.successIcon}>✓</span>

          <div>
            <strong>Targets saved</strong>
            <p>
              The {product} targets for{" "}
              {monthName(month)} {year} have been
              updated successfully.
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
            <span>Staff member</span>
          </div>

          <div>
            <span>Expected output</span>
          </div>

          <div>
            <span>Measurement</span>
          </div>
        </div>

        <div className={styles.staffList}>
          {staff.map((member, index) => {
            const existing = targetMap.get(member.id);

            const targetError =
              state.fieldErrors?.[`target-${member.id}`];

            const unitError =
              state.fieldErrors?.[`unit-${member.id}`];

            return (
              <div
                key={member.id}
                className={styles.staffRow}
              >
                <div className={styles.staffIdentity}>
                  <div className={styles.staffNumber}>
                    {String(index + 1).padStart(2, "0")}
                  </div>

                  <div>
                    <strong>{member.name}</strong>

                    <span>
                      {formatRole(member.role)}
                    </span>
                  </div>
                </div>

                <div className={styles.quantityField}>
                  <input
                    name={`target-${member.id}`}
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    defaultValue={
                      existing
                        ? formatExistingValue(
                            existing.targetValue
                          )
                        : ""
                    }
                    placeholder="Enter target"
                    aria-label={`Target for ${member.name}`}
                    className={`${styles.quantityInput} ${
                      targetError
                        ? styles.inputError
                        : ""
                    }`}
                  />

                  {targetError && (
                    <span className={styles.fieldError}>
                      {targetError}
                    </span>
                  )}
                </div>

                <div className={styles.unitField}>
                  <select
                    name={`unit-${member.id}`}
                    defaultValue={
                      existing?.unit ??
                      AGO_UNITS[0].value
                    }
                    className={`${styles.unitSelect} ${
                      unitError
                        ? styles.inputError
                        : ""
                    }`}
                    aria-label={`Measurement unit for ${member.name}`}
                  >
                    {AGO_UNITS.map((unit) => (
                      <option
                        key={unit.value}
                        value={unit.value}
                      >
                        {unit.label}
                      </option>
                    ))}
                  </select>

                  {unitError && (
                    <span className={styles.fieldError}>
                      {unitError}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className={styles.consoleFooter}>
          <div className={styles.footerNote}>
            <span className={styles.lockMark}>●</span>

            <p>
              Only Administrators can change monthly targets.
              Blank rows are left unconfigured and do not create
              zero-value targets.
            </p>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className={styles.saveButton}
          >
            <span>
              {isPending
                ? "Saving targets…"
                : "Save monthly targets"}
            </span>

            {!isPending && (
              <span className={styles.buttonArrow}>
                →
              </span>
            )}
          </button>
        </div>
      </form>
    </section>
  );
}

function monthName(month: number): string {
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

function formatRole(role: string): string {
  return role
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}