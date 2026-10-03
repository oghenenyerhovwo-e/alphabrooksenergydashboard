import "dotenv/config";

import { prisma } from "../src/lib/prisma";

/**
 * Slice 1 staff setup. Run once, straight after the slice-1 migration:
 *
 *   npx tsx scripts/seed-slice1-staff.ts --yes
 *
 * - Eke Nwannediya Stephanie → MANAGEMENT
 * - verifies the single IT user
 * - creates the Celestine User (DRIVER, no Microsoft account, no password)
 *   and links it to the existing Driver row
 *
 * Idempotent: a second run changes nothing and says so.
 */

const STEPHANIE_ENTRA_ID = "f8fc95e8-a5ff-4d4a-af9a-09a468931aed";
const IT_ENTRA_ID = "68349eb7-ffbc-42f0-abd3-e9e6efddbb55";
const DRIVER_NAME = "Celestine";

function describeDatabase(): string {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error("DATABASE_URL is not set.");
  }
  const url = new URL(raw);
  return `${url.hostname} / ${url.pathname.replace(/^\//, "")}`;
}

async function main() {
  console.log(`Target database: ${describeDatabase()}`);

  if (!process.argv.includes("--yes")) {
    console.error("Refusing to run without --yes.");
    process.exit(1);
  }

  const actions = await prisma.$transaction(async (tx) => {
    const log: string[] = [];

    // 1. Stephanie → MANAGEMENT
    const stephanie = await tx.user.findUnique({
      where: { entraId: STEPHANIE_ENTRA_ID },
    });
    if (!stephanie) {
      throw new Error(`User with entraId ${STEPHANIE_ENTRA_ID} not found.`);
    }
    if (stephanie.role === "MANAGEMENT") {
      log.push(`unchanged: ${stephanie.name} is MANAGEMENT`);
    } else {
      await tx.user.update({
        where: { id: stephanie.id },
        data: { role: "MANAGEMENT" },
      });
      log.push(`updated: ${stephanie.name} ${stephanie.role} → MANAGEMENT`);
    }

    // 2. The IT user must already be IT (not changed here)
    const itUser = await tx.user.findUnique({
      where: { entraId: IT_ENTRA_ID },
    });
    if (!itUser) {
      throw new Error(`User with entraId ${IT_ENTRA_ID} not found.`);
    }
    if (itUser.role !== "IT") {
      throw new Error(
        `User ${itUser.name} (${IT_ENTRA_ID}) has role ${itUser.role}, expected IT.`
      );
    }
    log.push(`unchanged: ${itUser.name} is IT`);

    // 3. Celestine Driver → linked DRIVER user
    const drivers = await tx.driver.findMany({
      where: { name: DRIVER_NAME },
    });
    if (drivers.length !== 1) {
      throw new Error(
        `Expected exactly one Driver named "${DRIVER_NAME}", found ${drivers.length}.`
      );
    }
    const driver = drivers[0];
    if (driver.userId) {
      log.push(`unchanged: Driver ${driver.name} already linked to user ${driver.userId}`);
    } else {
      const driverUser = await tx.user.create({
        data: {
          name: driver.name,
          role: "DRIVER",
          entraId: null,
          phone: driver.phone,
          status: "ACTIVE",
        },
      });
      await tx.driver.update({
        where: { id: driver.id },
        data: { userId: driverUser.id },
      });
      log.push(`created: user ${driverUser.name} (DRIVER, ${driverUser.id}) linked to Driver ${driver.id}`);
    }

    // 4. No other IT users may remain
    const otherItUsers = await tx.user.findMany({
      where: { role: "IT", NOT: { id: itUser.id } },
      select: { name: true },
    });
    if (otherItUsers.length > 0) {
      throw new Error(
        `Unexpected IT users: ${otherItUsers.map((u) => u.name).join(", ")}.`
      );
    }

    return log;
  }, { maxWait: 20_000, timeout: 30_000 }); // Neon cold starts

  for (const line of actions) {
    console.log(line);
  }
  if (actions.every((line) => line.startsWith("unchanged"))) {
    console.log("Nothing to change.");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
