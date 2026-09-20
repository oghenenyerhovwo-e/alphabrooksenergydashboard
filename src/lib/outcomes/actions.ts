"use server";

import { revalidatePath } from "next/cache";
import { deriveOutcomeValue } from "@/lib/outcomes/calculations";
import { toOutcomeDecimal } from "@/lib/outcomes/decimal";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";

import {
  isValidOutcomeProduct,
  isValidOutcomeUnit,
  validateOutcomeTarget,
  validateOutcomeAchievement,
  validateOutcomeFact,
} from "@/lib/outcomes/validation";

import {
  isOutcomeProductActive,
} from "@/config/outcomeProducts";

import {
  filterEligibleOutcomeStaff,
} from "@/lib/outcomes/eligibility";

import type {
  OutcomeProduct,
  OutcomeUnit,
} from "@/generated/prisma/enums";

/* =========================================================
   TARGET ACTION STATE
========================================================= */

export interface OutcomeTargetActionState {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

/* =========================================================
   ACHIEVEMENT ACTION STATE
========================================================= */

export interface OutcomeAchievementActionState {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

/* =========================================================
   SHARED INPUT HELPERS
========================================================= */

/**
 * Convert a FormData value to a string without using
 * JavaScript floating-point parsing for financial values.
 *
 * The validation layer receives the resulting string and
 * Prisma.Decimal is responsible for the actual decimal
 * representation.
 */
function getFormString(
  formData: FormData,
  name: string
): string {
  const value = formData.get(name);

  return typeof value === "string"
    ? value.trim()
    : "";
}

/**
 * Parse year/month only at the structural boundary.
 *
 * Year and month are not financial values, so ordinary
 * integer conversion is appropriate here.
 */
function parseIntegerField(
  formData: FormData,
  name: string
): number | null {
  const raw = getFormString(formData, name);

  if (!raw) {
    return null;
  }

  const parsed = Number(raw);

  return Number.isInteger(parsed)
    ? parsed
    : null;
}

/* =========================================================
   ADMIN — SAVE MONTHLY TARGETS
========================================================= */

/**
 * Records monthly Outcomes targets for eligible staff.
 *
 * Authoritative financial flow:
 *
 * target quantity
 *       +
 * target margin per unit
 *       ↓
 * validation
 *       ↓
 * deriveOutcomeValue()
 *       ↓
 * targetGeneratedValue
 *
 * The client-supplied generated value is never trusted.
 *
 * Target input field names:
 *
 *   year
 *   month
 *   product
 *   target-${userId}
 *   margin-${userId}
 *   unit-${userId}
 *
 * Blank target rows remain unconfigured and are skipped,
 * preserving the existing target-console behavior.
 */
export async function saveOutcomeTargetsAction(
  _previousState: OutcomeTargetActionState,
  formData: FormData
): Promise<OutcomeTargetActionState> {
  /* -------------------------------------------------------
     AUTHENTICATION
  ------------------------------------------------------- */

  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return {
      error:
        "You must be signed in to manage Outcomes targets.",
    };
  }

  /* -------------------------------------------------------
     ADMIN AUTHORIZATION
  ------------------------------------------------------- */

  if (currentUser.role !== "ADMIN") {
    return {
      error:
        "Only Administrators can create or edit Outcomes targets.",
    };
  }

  /* -------------------------------------------------------
     PERIOD
  ------------------------------------------------------- */

  const year =
    parseIntegerField(formData, "year");

  const month =
    parseIntegerField(formData, "month");

  if (
    year === null ||
    year < 2026 ||
    year > 2100
  ) {
    return {
      error:
        "Select a valid reporting year.",
    };
  }

  if (
    month === null ||
    month < 1 ||
    month > 12
  ) {
    return {
      error:
        "Select a valid reporting month.",
    };
  }

  /* -------------------------------------------------------
     PRODUCT
  ------------------------------------------------------- */

  const productRaw =
    getFormString(formData, "product");

  if (!isValidOutcomeProduct(productRaw)) {
    return {
      error:
        "Select a valid Outcomes product.",
    };
  }

  const product: OutcomeProduct =
    productRaw;

  if (!isOutcomeProductActive(product)) {
    return {
      error:
        `${product} is currently dormant and cannot receive targets.`,
    };
  }

  /* -------------------------------------------------------
     ELIGIBLE STAFF
  ------------------------------------------------------- */

  const staff =
    await prisma.user.findMany({
      where: {
        status: "ACTIVE",
      },
      orderBy: {
        name: "asc",
      },
    });

  const eligibleStaff =
    filterEligibleOutcomeStaff(staff);

  if (eligibleStaff.length === 0) {
    return {
      error:
        "No eligible Outcomes staff members were found.",
    };
  }

  /* -------------------------------------------------------
     VALIDATE ALL TARGET ROWS BEFORE CALCULATION
  ------------------------------------------------------- */

  const fieldErrors: Record<string, string> = {};

  const targetRows = eligibleStaff.map(
    (member) => {
      const quantity =
        getFormString(
          formData,
          `target-${member.id}`
        );

      const marginPerUnit =
        getFormString(
          formData,
          `margin-${member.id}`
        );

      const unitRaw =
        getFormString(
          formData,
          `unit-${member.id}`
        );

      /*
       * Existing console behavior:
       *
       * A completely blank target row is left
       * unconfigured and does not create a record.
       *
       * This is intentionally preserved.
       */
      if (
        !quantity &&
        !marginPerUnit
      ) {
        return {
          member,
          skip: true,
          quantity: null,
          marginPerUnit: null,
          unit: null,
        };
      }

      const validation =
        validateOutcomeTarget({
          userId: member.id,
          product,
          year,
          month,
          quantity,
          marginPerUnit,
          unit: unitRaw,
        });

      if (!validation.valid) {
        if (validation.errors.quantity) {
          fieldErrors[
            `target-${member.id}`
          ] =
            validation.errors.quantity;
        }

        if (validation.errors.marginPerUnit) {
          fieldErrors[
            `margin-${member.id}`
          ] =
            validation.errors.marginPerUnit;
        }

        if (validation.errors.unit) {
          fieldErrors[
            `unit-${member.id}`
          ] =
            validation.errors.unit;
        }

        if (validation.errors.product) {
          fieldErrors.product =
            validation.errors.product;
        }

        if (validation.errors.year) {
          fieldErrors.year =
            validation.errors.year;
        }

        if (validation.errors.month) {
          fieldErrors.month =
            validation.errors.month;
        }
      }

      return {
        member,
        skip: false,
        quantity,
        marginPerUnit,
        unit: isValidOutcomeUnit(unitRaw)
          ? unitRaw
          : null,
      };
    }
  );

  /* -------------------------------------------------------
     STOP BEFORE CALCULATION IF ANY INPUT IS INVALID
  ------------------------------------------------------- */

  if (
    Object.keys(fieldErrors).length > 0
  ) {
    return {
      error:
        "Please correct the highlighted target fields.",
      fieldErrors,
    };
  }

  /* -------------------------------------------------------
     CALCULATE + PERSIST
  ------------------------------------------------------- */

  try {
    await prisma.$transaction(
      async (tx) => {
        for (const row of targetRows) {
          if (
            row.skip ||
            row.quantity === null ||
            row.marginPerUnit === null ||
            row.unit === null
          ) {
            continue;
          }

          /*
           * The server derives the authoritative
           * financial value.
           *
           * The client has no opportunity to override
           * this calculation.
           */
          const targetGeneratedValue =
            deriveOutcomeValue(
              row.quantity,
              row.marginPerUnit
            );

          await tx.outcomeTarget.upsert({
            where: {
              userId_product_year_month: {
                userId:
                  row.member.id,
                product,
                year,
                month,
              },
            },

            create: {
              userId:
                row.member.id,

              product,

              year,

              month,

              targetQuantity:
                row.quantity,

              unit:
                row.unit,

              targetMarginPerUnit:
                row.marginPerUnit,

              targetGeneratedValue,

              createdById:
                currentUser.id,
            },

            update: {
              targetQuantity:
                row.quantity,

              unit:
                row.unit,

              targetMarginPerUnit:
                row.marginPerUnit,

              targetGeneratedValue,

              updatedById:
                currentUser.id,
            },
          });
        }
      }
    );
  } catch (error) {
    console.error(
      "[saveOutcomeTargetsAction]",
      error
    );

    return {
      error:
        "Something went wrong while saving the Outcomes targets.",
    };
  }

  /* -------------------------------------------------------
     CACHE REVALIDATION
  ------------------------------------------------------- */

  revalidatePath("/outcomes");

  return {
    success: true,
  };
}

/* =========================================================
   STAFF — SAVE MONTHLY ACHIEVEMENT
========================================================= */

/**
 * Records the actual measurable output produced by
 * the currently authenticated staff member.
 *
 * Authoritative financial flow:
 *
 * actual quantity
 *       +
 * actual margin per unit
 *       ↓
 * validation
 *       ↓
 * deriveOutcomeValue()
 *       ↓
 * achievedGeneratedValue
 *
 * The submitting user is ALWAYS derived from the
 * authenticated session.
 *
 * The client cannot submit another user's ID.
 *
 * Expected FormData fields:
 *
 *   year
 *   month
 *   product
 *   quantity
 *   marginPerUnit
 *
 * The measurement unit is taken from the staff member's
 * configured target so the achievement uses the same unit.
 */
export async function saveOutcomeAchievementAction(
  _previousState: OutcomeAchievementActionState,
  formData: FormData
): Promise<OutcomeAchievementActionState> {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return {
      error:
        "You must be signed in to record an achievement.",
    };
  }

  const year = Number(
    formData.get("year")
  );

  const month = Number(
    formData.get("month")
  );

  const productRaw =
    String(formData.get("product") ?? "").trim();

  const quantityRaw =
    String(formData.get("quantity") ?? "").trim();

  const marginRaw =
    String(formData.get("marginPerUnit") ?? "").trim();

  if (
    !Number.isInteger(year) ||
    year < 2026 ||
    year > 2100
  ) {
    return {
      error: "Select a valid reporting year.",
    };
  }

  if (
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  ) {
    return {
      error: "Select a valid reporting month.",
    };
  }

  if (!isValidOutcomeProduct(productRaw)) {
    return {
      error:
        "Select a valid Outcomes product.",
    };
  }

  if (!isOutcomeProductActive(productRaw)) {
    return {
      error:
        `${productRaw} is currently dormant.`,
    };
  }

  if (!quantityRaw) {
    return {
      fieldErrors: {
        quantity:
          "Enter the actual quantity achieved.",
      },
      error:
        "Please enter your achievement quantity.",
    };
  }

  if (!marginRaw) {
    return {
      fieldErrors: {
        marginPerUnit:
          "Enter the actual margin per unit.",
      },
      error:
        "Please enter the actual margin per unit.",
    };
  }

  /*
   * The authenticated user's target determines the
   * authoritative measurement unit.
   *
   * The client does not get to choose another user's
   * identity or change the configured unit.
   */
  const target =
    await prisma.outcomeTarget.findUnique({
      where: {
        userId_product_year_month: {
          userId: currentUser.id,
          product: productRaw,
          year,
          month,
        },
      },

      select: {
        unit: true,
      },
    });

  if (!target) {
    return {
      error:
        "A target has not been configured for you for this period. Please contact an Administrator.",
    };
  }

  const unit: OutcomeUnit =
    target.unit;

  const validation =
    validateOutcomeFact({
      userId: currentUser.id,
      product: productRaw,
      year,
      month,
      quantity: quantityRaw,
      marginPerUnit: marginRaw,
      unit,
    });

  if (!validation.valid) {
    const fieldErrors: Record<string, string> = {};

    if (validation.errors.quantity) {
      fieldErrors.quantity =
        validation.errors.quantity;
    }

    if (validation.errors.marginPerUnit) {
      fieldErrors.marginPerUnit =
        validation.errors.marginPerUnit;
    }

    if (validation.errors.unit) {
      fieldErrors.unit =
        validation.errors.unit;
    }

    return {
      error:
        "The achievement could not be validated.",
      fieldErrors,
    };
  }

  let quantity;
  let marginPerUnit;
  let generatedValue;

  try {
    quantity =
      toOutcomeDecimal(quantityRaw);

    marginPerUnit =
      toOutcomeDecimal(marginRaw);

    generatedValue =
      deriveOutcomeValue(
        quantity,
        marginPerUnit
      );
  } catch (error) {
    console.error(
      "[saveOutcomeAchievementAction:decimal]",
      error
    );

    return {
      error:
        "The achievement values could not be processed.",
    };
  }

  try {
    await prisma.outcomeAchievement.upsert({
      where: {
        userId_product_year_month: {
          userId: currentUser.id,
          product: productRaw,
          year,
          month,
        },
      },

      create: {
        userId: currentUser.id,
        product: productRaw,
        year,
        month,
        achievedQuantity:
          quantity,
        unit,
        achievedMarginPerUnit:
          marginPerUnit,
        achievedGeneratedValue:
          generatedValue,
        createdById:
          currentUser.id,
      },

      update: {
        achievedQuantity:
          quantity,
        unit,
        achievedMarginPerUnit:
          marginPerUnit,
        achievedGeneratedValue:
          generatedValue,
        updatedById:
          currentUser.id,
      },
    });
  } catch (error) {
    console.error(
      "[saveOutcomeAchievementAction]",
      error
    );

    return {
      error:
        "Something went wrong while saving your achievement.",
    };
  }

  revalidatePath("/outcomes");

  return {
    success: true,
  };
}