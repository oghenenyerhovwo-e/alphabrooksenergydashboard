import { redirect } from "next/navigation";
import {
  toOutcomeNumber,
} from "@/lib/outcomes/decimal";
import {
  OutcomeAchievementEntry,
} from "@/components/outcomes/OutcomeAchievementEntry";
import type {
  OutcomeProduct,
} from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";

import {
  getCurrentUser,
} from "@/lib/auth/session";

import {
  filterEligibleOutcomeStaff,
} from "@/lib/outcomes/eligibility";

import {
  isOutcomeProductActive,
} from "@/config/outcomeProducts";

import {
  OutcomeTargetConsole,
} from "@/components/outcomes/OutcomeTargetConsole";

import {
  OutcomePerformancePanel,
} from "@/components/outcomes/OutcomePerformancePanel";

import styles from "./page.module.css";

const YEARS = [
  2026,
  2027,
  2028,
] as const;

const MONTHS = [
  { value: 1, short: "Jan", full: "January" },
  { value: 2, short: "Feb", full: "February" },
  { value: 3, short: "Mar", full: "March" },
  { value: 4, short: "Apr", full: "April" },
  { value: 5, short: "May", full: "May" },
  { value: 6, short: "Jun", full: "June" },
  { value: 7, short: "Jul", full: "July" },
  { value: 8, short: "Aug", full: "August" },
  { value: 9, short: "Sep", full: "September" },
  { value: 10, short: "Oct", full: "October" },
  { value: 11, short: "Nov", full: "November" },
  { value: 12, short: "Dec", full: "December" },
] as const;

const PRODUCTS = [
  {
    key: "AGO" as OutcomeProduct,
    label: "AGO",
    description: "Automotive Gas Oil",
    status: "ACTIVE" as const,
    unit: "Litres",
  },
  {
    key: "CNG" as OutcomeProduct,
    label: "CNG",
    description: "Compressed Natural Gas",
    status: "DORMANT" as const,
    unit: "SCM",
  },
  {
    key: "LPG" as OutcomeProduct,
    label: "LPG",
    description: "Liquefied Petroleum Gas",
    status: "DORMANT" as const,
    unit: "Kg",
  },
];

interface OutcomesPageProps {
  searchParams: Promise<{
    year?: string;
    month?: string;
    product?: string;
  }>;
}

export default async function OutcomesPage({
  searchParams,
}: OutcomesPageProps) {
  const currentUser =
    await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  const params =
    await searchParams;

  const now =
    new Date();

  const fallbackYear =
    YEARS.includes(
      now.getFullYear() as (typeof YEARS)[number]
    )
      ? now.getFullYear()
      : 2026;

  const requestedYear =
    Number(params.year);

  const selectedYear =
    YEARS.includes(
      requestedYear as (typeof YEARS)[number]
    )
      ? requestedYear
      : fallbackYear;

  const requestedMonth =
    Number(params.month);

  const selectedMonth =
    Number.isInteger(requestedMonth) &&
    requestedMonth >= 1 &&
    requestedMonth <= 12
      ? requestedMonth
      : now.getMonth() + 1;

  const requestedProduct =
    params.product;

  const selectedProduct: OutcomeProduct =
    requestedProduct === "CNG" ||
    requestedProduct === "LPG"
      ? requestedProduct
      : "AGO";

  const selectedMonthDetails =
    MONTHS.find(
      (month) =>
        month.value ===
        selectedMonth
    ) ?? MONTHS[0];

  /*
   * Eligible staff remain sourced from the existing
   * Outcomes eligibility layer.
   */
  const eligibleStaff =
    filterEligibleOutcomeStaff(
      await prisma.user.findMany({
        where: {
          status: "ACTIVE",
        },
        orderBy: {
          name: "asc",
        },
      })
    );

  const staffIds =
    eligibleStaff.map(
      (staff) => staff.id
    );

  /*
   * Existing targets.
   */
  const existingTargets =
    isOutcomeProductActive(
      selectedProduct
    )
      ? (
          await prisma.outcomeTarget.findMany({
            where: {
              product: selectedProduct,
              year: selectedYear,
              month: selectedMonth,
              userId: {
                in: staffIds,
              },
            },
            select: {
              userId: true,
              targetQuantity: true,
              targetMarginPerUnit: true,
              targetValue: true,
              unit: true,
            },
          })
        ).map((target) => ({
          userId: target.userId,
          targetQuantity: toOutcomeNumber(
            target.targetQuantity
          ),
          targetMarginPerUnit:
            target.targetMarginPerUnit === null
              ? null
              : toOutcomeNumber(
                  target.targetMarginPerUnit
                ),
          targetValue: toOutcomeNumber(
            target.targetQuantity
          ),
          unit: target.unit,
        }))
      : [];

  /*
   * Existing achievements.
   */
  const existingAchievements =
  isOutcomeProductActive(
    selectedProduct
  )
    ? (
        await prisma.outcomeAchievement.findMany({
          where: {
            product: selectedProduct,
            year: selectedYear,
            month: selectedMonth,
            userId: {
              in: staffIds,
            },
          },
          select: {
            userId: true,
            achievedQuantity: true,
            unit: true,
          },
        })
      ).map((achievement) => ({
        userId: achievement.userId,
        achievedValue: toOutcomeNumber(
          achievement.achievedQuantity
        ),
        unit: achievement.unit,
      }))
    : [];

    const currentUserAchievement =
  isOutcomeProductActive(
    selectedProduct
  )
    ? await prisma.outcomeAchievement.findUnique({
        where: {
          userId_product_year_month: {
            userId: currentUser.id,
            product: selectedProduct,
            year: selectedYear,
            month: selectedMonth,
          },
        },
        select: {
          achievedQuantity: true,
          achievedMarginPerUnit: true,
          achievedGeneratedValue: true,
          unit: true,
        },
      })
    : null;

    const currentUserTarget =
      existingTargets.find(
        (target) =>
          target.userId ===
          currentUser.id
      ) ?? null;

    const currentUserAchievementForEntry =
  currentUserAchievement
    ? {
        achievedQuantity:
          currentUserAchievement.achievedQuantity !==
          null
            ? toOutcomeNumber(
                currentUserAchievement.achievedQuantity
              )
            : null,

        achievedMarginPerUnit:
          currentUserAchievement.achievedMarginPerUnit !==
          null
            ? toOutcomeNumber(
                currentUserAchievement.achievedMarginPerUnit
              )
            : null,

        achievedGeneratedValue:
          currentUserAchievement.achievedGeneratedValue !==
          null
            ? toOutcomeNumber(
                currentUserAchievement.achievedGeneratedValue
              )
            : null,

        unit:
          currentUserAchievement.unit,
      }
    : null;

  const targetMap =
    new Map(
      existingTargets.map(
        (target) => [
          target.userId,
          target,
        ]
      )
    );

  const achievementMap =
    new Map(
      existingAchievements.map(
        (achievement) => [
          achievement.userId,
          achievement,
        ]
      )
    );

  const staffPerformance =
    eligibleStaff.map(
      (staff) => ({
        user: {
          id: staff.id,
          name: staff.name,
          role: staff.role,
        },

        target:
          targetMap.get(
            staff.id
          ) ?? null,

        achievement:
          achievementMap.get(
            staff.id
          ) ?? null,
      })
    );

  const isAdmin =
    currentUser.role ===
    "ADMIN";

  return (
    <main className={styles.page}>
      {/* =====================================================
          PAGE HEADER
      ====================================================== */}

      <header
        className={styles.header}
      >
        <div
          className={styles.headerCopy}
        >
          <div
            className={styles.eyebrow}
          >
            BUSINESS PERFORMANCE
          </div>

          <h1
            className={styles.title}
          >
            Business Outcomes
          </h1>

          <p
            className={styles.subtitle}
          >
            Track measurable business output separately
            from day-to-day activities and tasks.
          </p>
        </div>

        <div
          className={styles.periodBadge}
        >
          <span>
            Selected period
          </span>

          <strong>
            {selectedMonthDetails.full}{" "}
            {selectedYear}
          </strong>

          <small>
            {selectedProduct}
          </small>
        </div>
      </header>

      {/* =====================================================
          PRODUCT SELECTOR
      ====================================================== */}

      <section
        className={styles.productSection}
      >
        <div
          className={styles.sectionHeading}
        >
          <div>
            <div
              className={
                styles.sectionEyebrow
              }
            >
              OUTPUT CATEGORY
            </div>

            <h2>
              Energy Products
            </h2>
          </div>

          <p>
            Select the product whose measurable output
            you want to manage.
          </p>
        </div>

        <div
          className={styles.productGrid}
        >
          {PRODUCTS.map(
            (product) => {
              const isSelected =
                selectedProduct ===
                product.key;

              const isDormant =
                product.status ===
                "DORMANT";

              return (
                <a
                  key={
                    product.key
                  }
                  href={
                    isDormant
                      ? undefined
                      : buildOutcomeUrl({
                          year:
                            selectedYear,
                          month:
                            selectedMonth,
                          product:
                            product.key,
                        })
                  }
                  aria-disabled={
                    isDormant
                  }
                  className={`${styles.productCard} ${
                    isSelected
                      ? styles.productCardSelected
                      : ""
                  } ${
                    isDormant
                      ? styles.productCardDormant
                      : ""
                  }`}
                >
                  <div
                    className={
                      styles.productTop
                    }
                  >
                    <div
                      className={`${styles.productIcon} ${
                        isSelected
                          ? styles.productIconSelected
                          : ""
                      }`}
                    >
                      {product.key.charAt(
                        0
                      )}
                    </div>

                    <span
                      className={`${styles.productStatus} ${
                        isDormant
                          ? styles.productStatusDormant
                          : styles.productStatusActive
                      }`}
                    >
                      {product.status}
                    </span>
                  </div>

                  <div
                    className={
                      styles.productName
                    }
                  >
                    {product.label}
                  </div>

                  <div
                    className={
                      styles.productDescription
                    }
                  >
                    {product.description}
                  </div>

                  <div
                    className={
                      styles.productFooter
                    }
                  >
                    <span>
                      Measurement
                    </span>

                    <strong>
                      {product.unit}
                    </strong>
                  </div>
                </a>
              );
            }
          )}
        </div>
      </section>

      {/* =====================================================
          MAIN WORKSPACE
      ====================================================== */}

      <section
        className={styles.workspace}
      >
        {/* ===================================================
            PERIOD NAVIGATION
        ==================================================== */}

        <aside
          className={
            styles.calendarPanel
          }
        >
          <div
            className={
              styles.calendarHeader
            }
          >
            <div>
              <div
                className={
                  styles.sectionEyebrow
                }
              >
                PERIOD
              </div>

              <h2>
                Reporting year
              </h2>
            </div>

            <div
              className={
                styles.calendarIcon
              }
            >
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>

          <div
            className={
              styles.yearList
            }
          >
            {YEARS.map(
              (year) => {
                const isSelectedYear =
                  selectedYear ===
                  year;

                return (
                  <div
                    key={year}
                    className={`${styles.yearGroup} ${
                      isSelectedYear
                        ? styles.yearGroupSelected
                        : ""
                    }`}
                  >
                    <div
                      className={
                        styles.yearButton
                      }
                      aria-current={
                        isSelectedYear
                          ? "true"
                          : undefined
                      }
                    >
                      <span
                        className={
                          styles.yearNumber
                        }
                      >
                        {year}
                      </span>

                      <span
                        className={
                          styles.yearArrow
                        }
                      >
                        →
                      </span>
                    </div>

                    <div
                      className={
                        styles.monthList
                      }
                    >
                      {MONTHS.map(
                        (month) => {
                          const isSelected =
                            selectedYear ===
                              year &&
                            selectedMonth ===
                              month.value;

                          return (
                            <a
                              key={
                                month.value
                              }
                              href={buildOutcomeUrl(
                                {
                                  year,
                                  month:
                                    month.value,
                                  product:
                                    selectedProduct,
                                }
                              )}
                              className={`${styles.monthButton} ${
                                isSelected
                                  ? styles.monthButtonSelected
                                  : ""
                              }`}
                            >
                              <span>
                                {
                                  month.short
                                }
                              </span>

                              {isSelected && (
                                <span
                                  className={
                                    styles.monthIndicator
                                  }
                                />
                              )}
                            </a>
                          );
                        }
                      )}
                    </div>
                  </div>
                );
              }
            )}
          </div>

          <div
            className={
              styles.calendarNote
            }
          >
            <span
              className={
                styles.noteDot
              }
            />

            <p>
              Outcomes are tracked by month.
              Daily and weekly views are not
              part of this module.
            </p>
          </div>
        </aside>

        {/* ===================================================
            PERFORMANCE AREA
        ==================================================== */}

        <section
          className={
            styles.performancePanel
          }
        >
          <div
            className={
              styles.performanceHeader
            }
          >
            <div>
              <div
                className={
                  styles.sectionEyebrow
                }
              >
                MONTHLY OUTPUT
              </div>

              <h2>
                {selectedProduct} ·{" "}
                {
                  selectedMonthDetails.full
                }{" "}
                {selectedYear}
              </h2>

              <p>
                {isAdmin
                  ? "Manage targets and review measurable output across the team."
                  : "Record your measurable output and see how it contributes to the team's result."}
              </p>
            </div>

            <div
              className={
                styles.activeProductMark
              }
            >
              <span
                className={
                  styles.activeProductDot
                }
              />

              {selectedProduct}
            </div>
          </div>

          {/* =================================================
              PHASE 3 PERFORMANCE DASHBOARD
          ================================================== */}

          <OutcomePerformancePanel
            currentUserId={
              currentUser.id
            }
            isAdmin={
              isAdmin
            }
            product={
              selectedProduct
            }
            year={
              selectedYear
            }
            month={
              selectedMonth
            }
            staffPerformance={
              staffPerformance
            }
          />

          {/* =================================================
              ADMIN TARGET CONSOLE
          ================================================== */}
          {isAdmin &&
          isOutcomeProductActive(selectedProduct) && (
            <OutcomeTargetConsole
                year={
                  selectedYear
                }
                month={
                  selectedMonth
                }
                product={
                  selectedProduct
                }
                staff={
                  eligibleStaff
                }
                existingTargets={
                  existingTargets
                }
              />
          )}

          {!isAdmin &&
            isOutcomeProductActive(
              selectedProduct
            ) && (
              <OutcomeAchievementEntry
                year={selectedYear}
                month={selectedMonth}
                product={selectedProduct}
                unit={
                  currentUserTarget?.unit ??
                  null
                }
                hasTarget={
                  currentUserTarget !== null
                }
                existingAchievement={
                  currentUserAchievementForEntry
                }
              />
  )}
        </section>
      </section>
    </main>
  );
}

function buildOutcomeUrl({
  year,
  month,
  product,
}: {
  year: number;
  month: number;
  product: OutcomeProduct;
}) {
  return `/outcomes?year=${year}&month=${month}&product=${product}`;
}