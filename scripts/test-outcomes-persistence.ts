// import "dotenv/config";
// import assert from "node:assert/strict";
// import { prisma } from "@/lib/prisma";

// async function main() {
//   const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
//   const staff = await prisma.user.findFirst({ where: { role: "SALES" } });

//   if (!admin || !staff) {
//     console.log("Skipped: need at least one ADMIN and one SALES user seeded to run this check.");
//     return;
//   }

//   const testYear = 2099; // clearly out-of-band test period, never a real reporting month
//   const testMonth = 1;

//   await prisma.outcomeTarget.deleteMany({
//     where: { userId: staff.id, product: "AGO", year: testYear, month: testMonth },
//   });

//   const target = await prisma.outcomeTarget.create({
//     data: {
//       userId: staff.id,
//       product: "AGO",
//       year: testYear,
//       month: testMonth,
//       targetValue: "100000.00",
//       unit: "LITRES",
//       createdById: admin.id,
//     },
//     include: { user: true, createdBy: true },
//   });

//   assert.equal(target.user.id, staff.id);
//   assert.equal(target.createdBy.id, admin.id);
//   console.log("ok — target created with staff + creator relations intact");

//   let duplicateRejected = false;
//   try {
//     await prisma.outcomeTarget.create({
//       data: {
//         userId: staff.id,
//         product: "AGO",
//         year: testYear,
//         month: testMonth,
//         targetValue: "999999.00",
//         unit: "LITRES",
//         createdById: admin.id,
//       },
//     });
//   } catch {
//     duplicateRejected = true;
//   }
//   assert.equal(duplicateRejected, true);
//   console.log("ok — duplicate staff/product/year/month target rejected by unique constraint");

//   const achievementBefore = await prisma.outcomeAchievement.findUnique({
//     where: {
//       userId_product_year_month: { userId: staff.id, product: "AGO", year: testYear, month: testMonth },
//     },
//   });
//   assert.equal(achievementBefore, null);
//   console.log("ok — missing achievement is genuinely absent (no row), not a zero-value row");

//   await prisma.outcomeTarget.deleteMany({
//     where: { userId: staff.id, product: "AGO", year: testYear, month: testMonth },
//   });

//   console.log("\nAll outcomes-persistence checks passed.");
// }

// main()
//   .then(() => prisma.$disconnect())
//   .catch(async (err) => {
//     console.error(err);
//     await prisma.$disconnect();
//     process.exit(1);
//   });