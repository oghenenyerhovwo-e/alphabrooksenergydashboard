import "dotenv/config";
import assert from "node:assert/strict";

import { prisma } from "../src/lib/prisma";
import type { Prisma } from "../src/generated/prisma/client";

/**
 * Slice 1 schema checks against the development database.
 *
 *   LEDGER_TEST_DB=dev npx tsx scripts/test-slice1-schema.ts
 *
 * Every case that writes runs inside its own transaction that ends by
 * throwing `Rollback`, so no rows are left behind.
 */

type Tx = Prisma.TransactionClient;

const STEPHANIE_ENTRA_ID = "f8fc95e8-a5ff-4d4a-af9a-09a468931aed";
const IT_ENTRA_ID = "68349eb7-ffbc-42f0-abd3-e9e6efddbb55";

// Neon can be slow to start a transaction from cold.
const TX_OPTIONS = { maxWait: 20_000, timeout: 30_000 };

let passed = 0;
let failed = 0;

function check(label: string, actual: unknown, expected: unknown) {
  try {
    assert.deepStrictEqual(actual, expected);
    passed++;
    console.log(`  ok — ${label}`);
  } catch {
    failed++;
    console.log(
      `  FAIL — ${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
  }
}

class Rollback extends Error {}

/** Runs `fn` in a transaction that is always rolled back. */
async function inRollback(fn: (tx: Tx) => Promise<void>) {
  try {
    await prisma.$transaction(async (tx) => {
      await fn(tx);
      throw new Rollback();
    }, TX_OPTIONS);
  } catch (err) {
    if (!(err instanceof Rollback)) throw err;
  }
}

function errorText(err: unknown): string {
  if (err instanceof Error) {
    const meta = (err as { meta?: unknown }).meta;
    return `${err.message} ${meta ? JSON.stringify(meta) : ""}`;
  }
  return String(err);
}

/**
 * Creates fixtures with `setup`, then expects `attempt` to be rejected by
 * the database, all in one rolled-back transaction. A failure in `setup`
 * counts as a test failure, not as the expected rejection.
 */
async function expectRejects<T>(
  label: string,
  setup: (tx: Tx) => Promise<T>,
  attempt: (tx: Tx, fixtures: T) => Promise<unknown>,
  messageIncludes?: string
) {
  let setupDone = false;
  let rejection: unknown = null;

  try {
    await prisma.$transaction(async (tx) => {
      const fixtures = await setup(tx);
      setupDone = true;
      await attempt(tx, fixtures);
      throw new Rollback();
    }, TX_OPTIONS);
  } catch (err) {
    if (!(err instanceof Rollback)) rejection = err;
  }

  if (!setupDone) {
    failed++;
    console.log(`  FAIL — ${label}: setup failed: ${errorText(rejection)}`);
    return;
  }
  if (rejection === null) {
    failed++;
    console.log(`  FAIL — ${label}: expected rejection, but it succeeded`);
    return;
  }
  if (messageIncludes && !errorText(rejection).includes(messageIncludes)) {
    failed++;
    console.log(
      `  FAIL — ${label}: rejected, but message lacks "${messageIncludes}": ${errorText(rejection)}`
    );
    return;
  }
  passed++;
  console.log(`  ok — ${label}`);
}

/* -------------------------------------------------------
   Fixtures (period 2099, invoices prefixed TEST-)
------------------------------------------------------- */

let fixtureCounter = 0;

function nextTag(): string {
  fixtureCounter++;
  return `${Date.now()}-${fixtureCounter}`;
}

async function createTestUser(tx: Tx, extra: Partial<Prisma.UserCreateInput> = {}) {
  return tx.user.create({
    data: {
      name: `TEST slice1 ${nextTag()}`,
      role: "SALES",
      entraId: null,
      ...extra,
    },
  });
}

async function createTestSale(
  tx: Tx,
  createdById: string,
  extra: Partial<Prisma.SaleRecordUncheckedCreateInput> = {}
) {
  return tx.saleRecord.create({
    data: {
      product: "AGO",
      invoiceNumber: `TEST-${nextTag()}`,
      customerName: "TEST customer",
      paymentDate: new Date("2099-01-15"),
      periodYear: 2099,
      periodMonth: 1,
      totalQuantity: "1000.000",
      unit: "LITRES",
      createdById,
      ...extra,
    },
  });
}

async function createTestAllocation(
  tx: Tx,
  saleRecordId: string,
  userId: string,
  createdById: string,
  extra: Partial<Prisma.SaleAllocationUncheckedCreateInput> = {}
) {
  return tx.saleAllocation.create({
    data: {
      saleRecordId,
      userId,
      sharePercent: "50.00",
      quantity: "500.000",
      marginPerUnit: "10.0000",
      generatedValue: "5000.00",
      createdById,
      ...extra,
    },
  });
}

async function saleFixture(tx: Tx) {
  const user = await createTestUser(tx);
  const sale = await createTestSale(tx, user.id);
  return { user, sale };
}

async function createTestAuditEntry(tx: Tx, actorUserId: string) {
  return tx.auditEntry.create({
    data: {
      entityType: "SALE_RECORD",
      entityId: `TEST-${nextTag()}`,
      action: "CREATE",
      after: { totalQuantity: "1000.000" },
      actorUserId,
      actorName: "TEST actor",
      actorRole: "SALES",
    },
  });
}

/* -------------------------------------------------------
   Cases
------------------------------------------------------- */

async function main() {
  if (process.env.LEDGER_TEST_DB !== "dev") {
    console.error("Refusing to run: set LEDGER_TEST_DB=dev.");
    process.exit(1);
  }
  const url = new URL(process.env.DATABASE_URL ?? "");
  console.log(`Target database: ${url.hostname} / ${url.pathname.slice(1)}`);

  console.log("\n1. UserRole enum");
  const enumRows = await prisma.$queryRaw<{ enumlabel: string }[]>`
    SELECT e.enumlabel
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'UserRole'
    ORDER BY e.enumsortorder`;
  check(
    "UserRole values",
    enumRows.map((r) => r.enumlabel),
    ["IT", "BUSINESS_DEVELOPMENT", "SALES", "OPERATIONS", "FINANCE", "MANAGEMENT", "DRIVER"]
  );

  console.log("\n2. Role assignments");
  const adminCount = await prisma.$queryRaw<{ n: bigint }[]>`
    SELECT COUNT(*) AS n FROM "User" WHERE "role"::text = 'ADMIN'`;
  check("no user has role ADMIN", Number(adminCount[0].n), 0);
  const stephanie = await prisma.user.findUnique({ where: { entraId: STEPHANIE_ENTRA_ID } });
  check("Stephanie is MANAGEMENT", stephanie?.role, "MANAGEMENT");
  const itUser = await prisma.user.findUnique({ where: { entraId: IT_ENTRA_ID } });
  check("68349eb7… is IT", itUser?.role, "IT");
  check("exactly 1 IT user", await prisma.user.count({ where: { role: "IT" } }), 1);

  console.log("\n3. Celestine driver user");
  const celestine = await prisma.driver.findFirst({
    where: { name: "Celestine" },
    include: { user: true },
  });
  check("Driver Celestine has userId", typeof celestine?.userId, "string");
  check("linked user role is DRIVER", celestine?.user?.role, "DRIVER");
  check("linked user entraId is null", celestine?.user?.entraId, null);
  check("linked user passwordHash is null", celestine?.user?.passwordHash, null);

  console.log("\n4. Users without entraId");
  await inRollback(async (tx) => {
    const a = await createTestUser(tx);
    const b = await createTestUser(tx);
    check("two users with entraId = null both inserted", [a.entraId, b.entraId], [null, null]);
  });

  console.log("\n5. Username uniqueness");
  const dupUsername = `test-slice1-${nextTag()}`;
  await expectRejects(
    "second user with the same username rejected",
    (tx) => createTestUser(tx, { username: dupUsername }),
    (tx) => createTestUser(tx, { username: dupUsername })
  );

  console.log("\n6. failedLoginCount default");
  await inRollback(async (tx) => {
    const u = await createTestUser(tx);
    check("failedLoginCount defaults to 0", u.failedLoginCount, 0);
  });

  console.log("\n7. Existing Sept-2026 targets");
  const septTargets = await prisma.outcomeTarget.findMany({ where: { year: 2026, month: 9 } });
  check("5 Sept-2026 targets still present", septTargets.length, 5);
  check(
    "setByInstructionOf / instructionDate null on legacy rows",
    septTargets.every((t) => t.setByInstructionOf === null && t.instructionDate === null),
    true
  );

  console.log("\n8. paymentDate round-trip");
  await inRollback(async (tx) => {
    const { sale } = await saleFixture(tx);
    const read = await tx.saleRecord.findUniqueOrThrow({ where: { id: sale.id } });
    check("paymentDate 2099-01-15 round-trips", read.paymentDate.toISOString().slice(0, 10), "2099-01-15");
  });

  console.log("\n9. zohoPaymentId uniqueness");
  await inRollback(async (tx) => {
    const user = await createTestUser(tx);
    const a = await createTestSale(tx, user.id, { zohoPaymentId: null });
    const b = await createTestSale(tx, user.id, { zohoPaymentId: null });
    check("two sales with null zohoPaymentId allowed", [a.zohoPaymentId, b.zohoPaymentId], [null, null]);
  });
  const dupZoho = `TEST-ZOHO-${nextTag()}`;
  await expectRejects(
    "duplicate non-null zohoPaymentId rejected",
    async (tx) => {
      const user = await createTestUser(tx);
      await createTestSale(tx, user.id, { zohoPaymentId: dupZoho });
      return user;
    },
    (tx, user) => createTestSale(tx, user.id, { zohoPaymentId: dupZoho })
  );

  console.log("\n10. invoiceNumber not unique");
  await inRollback(async (tx) => {
    const user = await createTestUser(tx);
    const invoice = `TEST-INV-${nextTag()}`;
    await createTestSale(tx, user.id, { invoiceNumber: invoice });
    await createTestSale(tx, user.id, { invoiceNumber: invoice });
    check(
      "two sales with the same invoiceNumber allowed",
      await tx.saleRecord.count({ where: { invoiceNumber: invoice } }),
      2
    );
  });

  console.log("\n11. sharePercent out of range");
  for (const bad of ["0", "-1", "100.01"]) {
    await expectRejects(
      `sharePercent ${bad} rejected`,
      saleFixture,
      (tx, { user, sale }) =>
        createTestAllocation(tx, sale.id, user.id, user.id, { sharePercent: bad }),
      "SaleAllocation_sharePercent_range"
    );
  }

  console.log("\n12. sharePercent bounds accepted");
  await inRollback(async (tx) => {
    const { user, sale } = await saleFixture(tx);
    const other = await createTestUser(tx);
    const low = await createTestAllocation(tx, sale.id, user.id, user.id, { sharePercent: "0.01" });
    const high = await createTestAllocation(tx, sale.id, other.id, user.id, { sharePercent: "100.00" });
    check("sharePercent 0.01 accepted", low.sharePercent.toString(), "0.01");
    check("sharePercent 100.00 accepted", high.sharePercent.toFixed(2), "100.00");
  });

  console.log("\n13. marginPerUnit non-negative");
  await expectRejects(
    "marginPerUnit -0.0001 rejected",
    saleFixture,
    (tx, { user, sale }) =>
      createTestAllocation(tx, sale.id, user.id, user.id, { marginPerUnit: "-0.0001" }),
    "SaleAllocation_marginPerUnit_nonnegative"
  );
  await inRollback(async (tx) => {
    const { user, sale } = await saleFixture(tx);
    const a = await createTestAllocation(tx, sale.id, user.id, user.id, { marginPerUnit: "0" });
    check("marginPerUnit 0 accepted", a.marginPerUnit.toString(), "0");
  });

  console.log("\n14. One allocation per sale and user");
  await expectRejects(
    "second allocation for the same sale + user rejected",
    async (tx) => {
      const f = await saleFixture(tx);
      await createTestAllocation(tx, f.sale.id, f.user.id, f.user.id);
      return f;
    },
    (tx, { user, sale }) => createTestAllocation(tx, sale.id, user.id, user.id)
  );

  console.log("\n15. Sale with allocations cannot be deleted");
  await expectRejects(
    "deleting a sale that has an allocation rejected",
    async (tx) => {
      const f = await saleFixture(tx);
      await createTestAllocation(tx, f.sale.id, f.user.id, f.user.id);
      return f;
    },
    (tx, { sale }) => tx.saleRecord.delete({ where: { id: sale.id } })
  );

  console.log("\n16–17. AuditEntry is append-only");
  await expectRejects(
    "UPDATE of AuditEntry rejected",
    async (tx) => {
      const user = await createTestUser(tx);
      return createTestAuditEntry(tx, user.id);
    },
    (tx, entry) =>
      tx.$executeRaw`UPDATE "AuditEntry" SET "reason" = 'tampered' WHERE "id" = ${entry.id}`,
    "append-only"
  );
  await expectRejects(
    "DELETE of AuditEntry rejected",
    async (tx) => {
      const user = await createTestUser(tx);
      return createTestAuditEntry(tx, user.id);
    },
    (tx, entry) => tx.auditEntry.delete({ where: { id: entry.id } }),
    "append-only"
  );

  console.log("\n18. AuditEntry JSON round-trip");
  await inRollback(async (tx) => {
    const user = await createTestUser(tx);
    const before = { totalQuantity: "12345.678", status: "PENDING_ALLOCATION" };
    const after = { totalQuantity: "12345.679", status: "ALLOCATED" };
    const entry = await tx.auditEntry.create({
      data: {
        entityType: "SALE_RECORD",
        entityId: `TEST-${nextTag()}`,
        action: "UPDATE",
        before,
        after,
        actorUserId: user.id,
        actorName: user.name,
        actorRole: user.role,
      },
    });
    const read = await tx.auditEntry.findUniqueOrThrow({ where: { id: entry.id } });
    check("before JSON round-trips", read.before, before);
    check("after JSON round-trips", read.after, after);
  });

  console.log("\n19. Decimal precision");
  await inRollback(async (tx) => {
    const user = await createTestUser(tx);
    const sale = await createTestSale(tx, user.id, { totalQuantity: "12345.678" });
    const read = await tx.saleRecord.findUniqueOrThrow({ where: { id: sale.id } });
    check("totalQuantity 12345.678 round-trips", read.totalQuantity.toString(), "12345.678");
  });

  console.log("\nCleanup");
  check(
    "no TEST- sales left behind",
    await prisma.saleRecord.count({ where: { invoiceNumber: { startsWith: "TEST-" } } }),
    0
  );
  check(
    "no TEST users left behind",
    await prisma.user.count({ where: { name: { startsWith: "TEST slice1" } } }),
    0
  );

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
