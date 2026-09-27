import "dotenv/config";

import { prisma } from "../src/lib/prisma";

/**
 * One-off: rewrite old profitability notification links
 *   /commercial/orders/{id}/profitability
 * to the new form
 *   /commercial/orders/profitability?orderId={id}
 *
 * Safe to run more than once: the new form does not match the check
 * below.
 *
 * NOTE: this deliberately does NOT combine startsWith/endsWith in the
 * Prisma `where` filter. Prisma ORM 7's query engine (this project
 * pins prisma@^7.10.0) fails that combination against Postgres with a
 * PrismaClientKnownRequestError. Instead we fetch the small set of
 * candidate rows and match the exact old link shape in plain JS.
 */
async function main() {
  const candidates = await prisma.notification.findMany({
    where: {
      internalOrderId: { not: null },
      link: { contains: "/profitability" },
    },
    select: {
      id: true,
      internalOrderId: true,
      link: true,
    },
  });

  const rowsToFix = candidates.filter(
    (row) =>
      row.internalOrderId !== null &&
      row.link === `/commercial/orders/${row.internalOrderId}/profitability`
  );

  console.log(`Found ${rowsToFix.length} notification(s) with the old link.`);

  for (const row of rowsToFix) {
    const newLink = `/commercial/orders/profitability?orderId=${row.internalOrderId}`;

    await prisma.notification.update({
      where: { id: row.id },
      data: { link: newLink },
    });

    console.log(`  ${row.link}  ->  ${newLink}`);
  }

  console.log("Done.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => process.exit(0));