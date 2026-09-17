"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";

import {
  isValidOutcomeProduct,
  isValidOutcomeUnit,
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
} from "@/generated/prisma/client";

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
   SHARED HELPERS
========================================================= */

function parsePositiveOrZeroNumber(
  value: string
): number | null {
  const trimmed = value.trim();

  if (!trimmed) return null;

  const parsed = Number(trimmed);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

/* =========================================================
   ADMIN — SAVE MONTHLY TARGETS
========================================================= */

export async function saveOutcomeTargetsAction(
  _previousState: OutcomeTargetActionState,
  formData: FormData
): Promise<OutcomeTargetActionState> {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return {
      error:
        "You must be signed in to manage Outcomes targets.",
    };
  }

  if (currentUser.role !== "ADMIN") {
    return {
      error:
        "Only Administrators can create or edit Outcomes targets.",
    };
  }

  const yearRaw = formData.get("year");
  const monthRaw = formData.get("month");
  const productRaw = formData.get("product");

  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const product = String(productRaw ?? "");

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

  if (!isValidOutcomeProduct(product)) {
    return {
      error: "Select a valid Outcomes product.",
    };
  }

  if (!isOutcomeProductActive(product)) {
    return {
      error:
        `${product} is currently dormant and cannot receive targets.`,
    };
  }

  const staff = await prisma.user.findMany({
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

  const fieldErrors: Record<string, string> = {};

  const targetRows = eligibleStaff.map((member) => {
    const quantityRaw =
      formData.get(`target-${member.id}`);

    const unitRaw =
      formData.get(`unit-${member.id}`);

    const quantityString =
      String(quantityRaw ?? "").trim();

    const unit =
      String(unitRaw ?? "");

    if (!quantityString) {
      return {
        member,
        skip: true,
        quantity: null,
        unit: null,
      };
    }

    const quantity =
      parsePositiveOrZeroNumber(quantityString);

    if (quantity === null) {
      fieldErrors[`target-${member.id}`] =
        "Enter a valid non-negative quantity.";
    }

    if (!isValidOutcomeUnit(unit)) {
      fieldErrors[`unit-${member.id}`] =
        "Select a valid measurement unit.";
    }

    const validation =
      validateOutcomeFact({
        userId: member.id,
        product,
        year,
        month,
        value: quantity,
        unit,
      });

    if (!validation.valid) {
      if (validation.errors.value) {
        fieldErrors[`target-${member.id}`] =
          validation.errors.value;
      }

      if (validation.errors.unit) {
        fieldErrors[`unit-${member.id}`] =
          validation.errors.unit;
      }
    }

    return {
      member,
      skip: false,
      quantity,
      unit: isValidOutcomeUnit(unit)
        ? unit
        : null,
    };
  });

  if (Object.keys(fieldErrors).length > 0) {
    return {
      error:
        "Please correct the highlighted target fields.",
      fieldErrors,
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      for (const row of targetRows) {
        if (
          row.skip ||
          row.quantity === null ||
          row.unit === null
        ) {
          continue;
        }

        await tx.outcomeTarget.upsert({
          where: {
            userId_product_year_month: {
              userId: row.member.id,
              product,
              year,
              month,
            },
          },

          create: {
            userId: row.member.id,
            product,
            year,
            month,
            targetValue:
              row.quantity.toFixed(2),
            unit: row.unit,
            createdById: currentUser.id,
          },

          update: {
            targetValue:
              row.quantity.toFixed(2),
            unit: row.unit,
            updatedById: currentUser.id,
          },
        });
      }
    });
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

  revalidatePath("/outcomes");

  return {
    success: true,
  };
}

/* =========================================================
   STAFF — SAVE MONTHLY ACHIEVEMENT
========================================================= */

/**
 * Records the actual measurable output produced by the
 * currently authenticated staff member.
 *
 * Important:
 * - Staff can only submit their own achievement.
 * - The server derives the user from the session.
 * - The client cannot submit another user's ID.
 * - Achievement never changes the target.
 * - Achievement is never capped at the target.
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
    String(formData.get("product") ?? "");

  const valueRaw =
    String(formData.get("value") ?? "").trim();

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

  if (!valueRaw) {
    return {
      fieldErrors: {
        value:
          "Enter the measurable output achieved.",
      },
      error:
        "Please enter your achievement.",
    };
  }

  const value =
    parsePositiveOrZeroNumber(valueRaw);

  if (value === null) {
    return {
      fieldErrors: {
        value:
          "Enter a valid non-negative quantity.",
      },
      error:
        "Please correct the achievement value.",
    };
  }

  /*
   * The achievement must use the same unit as the
   * configured target for that staff member/month.
   *
   * This prevents comparing litres against SCM, KG, etc.
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
      value,
      unit,
    });

  if (!validation.valid) {
    return {
      error:
        "The achievement could not be validated.",
      fieldErrors: {
        value:
          validation.errors.value ?? "",
        unit:
          validation.errors.unit ?? "",
      },
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
        achievedValue:
          value.toFixed(2),
        unit,
        createdById:
          currentUser.id,
      },

      update: {
        achievedValue:
          value.toFixed(2),
        unit,
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