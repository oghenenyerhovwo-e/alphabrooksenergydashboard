// /**
//  * MAIN OPERATIONS — PHASE 6 SNAPSHOT CHECKS
//  *
//  * The project has no unit-test framework (no jest, no vitest), so this
//  * follows the existing scripts/ convention: a tsx script you run by hand.
//  *
//  *   npx tsx --tsconfig tsconfig.json scripts/test-operations-snapshot.ts
//  *
//  * Every check below is pure — it builds a fixture in memory and asserts
//  * against the snapshot builder and the notes parser. No database, no
//  * Graph call, no network. Add `--db` to additionally exercise a real
//  * round trip against DATABASE_URL (writes one row for a clearly-marked
//  * test date, then deletes it).
//  */

// import "dotenv/config";

// import type { OperationsTeamData, OperationsTask } from "@/types/operations";
// import { buildOperationsDailyReportSnapshot } from "@/lib/operations/snapshot";
// import { parseNoteSections, extractBlockers } from "@/lib/operations/notes";
// import { getLagosReportDate, formatReportDateLabel, isValidReportDate } from "@/lib/operations/report-date";

// let failures = 0;

// function check(label: string, condition: boolean, detail?: unknown) {
//   if (condition) {
//     console.log(`  PASS  ${label}`);
//   } else {
//     failures += 1;
//     console.error(`  FAIL  ${label}`, detail ?? "");
//   }
// }

// /* ============================================================
//    FIXTURE — shaped like real Phase 2 output, with no real people
//    ============================================================ */

// const SHARED_NOTES = [
//   "UPDATE:",
//   "Customer has confirmed quantity.",
//   "",
//   "BLOCKER:",
//   "Waiting for supplier price.",
//   "",
//   "NEXT:",
//   "Prepare quotation when price is received.",
// ].join("\n");

// const sharedTask: OperationsTask = {
//   id: "task-shared",
//   title: "Prepare quotation",
//   assignees: [
//     { id: "user-a", name: "Employee A" },
//     { id: "user-b", name: "Employee B" },
//   ],
//   startDate: "2026-09-14T00:00:00Z",
//   dueDate: "2026-09-15T17:00:00Z",
//   completedDate: undefined,
//   priority: 3,
//   percentComplete: 50,
//   status: "in-progress",
//   isOverdue: true,
//   notes: SHARED_NOTES,
//   noteSections: parseNoteSections(SHARED_NOTES),
//   blockers: extractBlockers(SHARED_NOTES),
// };

// const doneTask: OperationsTask = {
//   id: "task-done",
//   title: "Issue invoice",
//   assignees: [{ id: "user-a", name: "Employee A" }],
//   startDate: undefined,
//   dueDate: "2026-09-15T17:00:00Z",
//   completedDate: "2026-09-15T10:00:00Z",
//   priority: 5,
//   percentComplete: 100,
//   status: "completed",
//   isOverdue: false,
//   notes: null,
//   noteSections: parseNoteSections(null),
//   blockers: [],
// };

// const fixture: OperationsTeamData = {
//   status: "connected",
//   lastUpdated: "2026-09-15T06:00:00.000Z",
//   employees: [
//     {
//       userId: "user-a",
//       name: "Employee A",
//       totalTasks: 2,
//       completedTasks: 1,
//       inProgressTasks: 1,
//       pendingTasks: 0,
//       completionPercentage: 50,
//       overdueTasks: [sharedTask],
//       blockers: [{ taskTitle: sharedTask.title, text: "Waiting for supplier price." }],
//       tasks: [sharedTask, doneTask],
//     },
//     {
//       userId: "user-b",
//       name: "Employee B",
//       totalTasks: 1,
//       completedTasks: 0,
//       inProgressTasks: 1,
//       pendingTasks: 0,
//       completionPercentage: 0,
//       overdueTasks: [sharedTask],
//       blockers: [{ taskTitle: sharedTask.title, text: "Waiting for supplier price." }],
//       tasks: [sharedTask],
//     },
//     {
//       userId: "user-c",
//       name: "Employee C",
//       totalTasks: 0,
//       completedTasks: 0,
//       inProgressTasks: 0,
//       pendingTasks: 0,
//       completionPercentage: null,
//       overdueTasks: [],
//       blockers: [],
//       tasks: [],
//     },
//   ],
//   unassignedTasks: [],
//   // Unique tasks: task-shared + task-done = 2, one completed.
//   overall: { totalUniqueTasks: 2, completedUniqueTasks: 1, completionPercentage: 50 },
// };

// /* ============================================================
//    CHECKS
//    ============================================================ */

// console.log("\nReporting date");
// {
//   const today = getLagosReportDate(new Date("2026-09-15T23:30:00Z")); // 00:30 on the 16th in Lagos
//   check("Lagos date rolls over ahead of UTC", today === "2026-09-16", today);
//   check("label formats without drifting", formatReportDateLabel("2026-09-15") === "15 September 2026");
//   check("rejects an impossible date", !isValidReportDate("2026-02-30"));
//   check("accepts a real date", isValidReportDate("2026-09-15"));
// }

// console.log("\nNotes parsing");
// {
//   const sections = parseNoteSections(SHARED_NOTES);
//   check("UPDATE preserved", sections.update === "Customer has confirmed quantity.", sections.update);
//   check("BLOCKER preserved", sections.blocker === "Waiting for supplier price.", sections.blocker);
//   check("NEXT preserved", sections.next === "Prepare quotation when price is received.", sections.next);

//   const lower = parseNoteSections("blocker: customer has not confirmed quantity.");
//   check("lowercase blocker: detected", lower.blocker === "customer has not confirmed quantity.", lower.blocker);
//   check("lowercase blocker extracted", extractBlockers("blocker: x").length === 1);
//   check("UPDATE: is never a blocker", extractBlockers("UPDATE: nothing blocking").length === 0);

//   const none = parseNoteSections(null);
//   check("absent notes give nulls, not invented text", none.update === null && none.blocker === null && none.next === null);
// }

// console.log("\nSnapshot");
// {
//   const departments = new Map<string, string | null>([
//     ["user-a", "Finance"],
//     ["user-b", "Sales"],
//     // user-c intentionally absent -> null, not guessed
//   ]);
//   const snap = buildOperationsDailyReportSnapshot(fixture, departments, new Date("2026-09-15T06:00:00Z"));

//   check("report date is the Lagos date", snap.reportDate === "2026-09-15", snap.reportDate);
//   check("timezone recorded", snap.timezone === "Africa/Lagos");

//   const a = snap.employees.find((e) => e.userId === "user-a")!;
//   const b = snap.employees.find((e) => e.userId === "user-b")!;
//   const c = snap.employees.find((e) => e.userId === "user-c")!;

//   check("department resolved", a.department === "Finance" && b.department === "Sales");
//   check("unmapped department is null, not invented", c.department === null);

//   check("multi-assignee task appears under A", a.tasks.some((t) => t.id === "task-shared"));
//   check("multi-assignee task appears under B", b.tasks.some((t) => t.id === "task-shared"));
//   check("overall counts the shared task once", snap.overall.totalUniqueTasks === 2, snap.overall);
//   check("overall completion preserved", snap.overall.completionPercentage === 50);

//   check("no-task employee is null, never 0%", c.completionPercentage === null);
//   check("employee completion preserved", a.completionPercentage === 50 && b.completionPercentage === 0);

//   check("status counts over unique tasks", snap.overall.statusCounts.completed === 1 && snap.overall.statusCounts.inProgress === 1 && snap.overall.statusCounts.pending === 0, snap.overall.statusCounts);
//   check("overdue counted once", snap.overall.statusCounts.overdue === 1, snap.overall.statusCounts);
//   check("blocker counted once overall", snap.overall.blockerCount === 1 && snap.overall.blockedTaskCount === 1, snap.overall);

//   const stored = a.tasks.find((t) => t.id === "task-shared")!;
//   check("full raw notes preserved", stored.notes === SHARED_NOTES);
//   check("note sections preserved", stored.noteSections.blocker === "Waiting for supplier price.");
//   check("start date preserved", stored.startDate === "2026-09-14T00:00:00Z");
//   check("completion date preserved", a.tasks.find((t) => t.id === "task-done")!.completedDate === "2026-09-15T10:00:00Z");
//   check("priority preserved", stored.priority === 3);

//   check("snapshot serializes cleanly", typeof JSON.parse(JSON.stringify(snap)).employees[0].name === "string");
// }

// /* ============================================================
//    OPTIONAL DATABASE ROUND TRIP
//    ============================================================ */

// async function dbRoundTrip() {
//   const { prisma } = await import("@/lib/prisma");
//   const { getOperationsDailyReportSnapshot } = await import("@/lib/operations/snapshot");

//   const TEST_DATE = "1970-01-01"; // clearly not a real reporting date
//   console.log("\nDatabase round trip");

//   await prisma.operationsDailyReport.deleteMany({ where: { reportDate: TEST_DATE } });

//   const departments = new Map<string, string | null>();
//   const snap = {
//     ...buildOperationsDailyReportSnapshot(fixture, departments, new Date("2026-09-15T06:00:00Z")),
//     reportDate: TEST_DATE,
//   };

//   await prisma.operationsDailyReport.create({
//     data: {
//       reportDate: TEST_DATE,
//       timezone: snap.timezone,
//       capturedAt: new Date(snap.capturedAt),
//       connectionStatus: snap.connectionStatus,
//       totalUniqueTasks: snap.overall.totalUniqueTasks,
//       completedUniqueTasks: snap.overall.completedUniqueTasks,
//       completionPercentage: snap.overall.completionPercentage,
//       completedCount: snap.overall.statusCounts.completed,
//       inProgressCount: snap.overall.statusCounts.inProgress,
//       pendingCount: snap.overall.statusCounts.pending,
//       overdueCount: snap.overall.statusCounts.overdue,
//       blockerCount: snap.overall.blockerCount,
//       // eslint-disable-next-line @typescript-eslint/no-explicit-any
//       snapshot: snap as any,
//     },
//   });

//   const readBack = await getOperationsDailyReportSnapshot(TEST_DATE);
//   check("snapshot reads back", readBack !== null);
//   check("notes survive the JSONB round trip", readBack?.employees[0].tasks[0].notes === SHARED_NOTES);

//   let duplicateRejected = false;
//   try {
//     // eslint-disable-next-line @typescript-eslint/no-explicit-any
//     await prisma.operationsDailyReport.create({ data: { reportDate: TEST_DATE, connectionStatus: "connected", totalUniqueTasks: 0, completedUniqueTasks: 0, completedCount: 0, inProgressCount: 0, pendingCount: 0, overdueCount: 0, blockerCount: 0, snapshot: {} as any } });
//   } catch {
//     duplicateRejected = true;
//   }
//   check("duplicate reporting date rejected", duplicateRejected);

//   await prisma.operationsDailyReport.deleteMany({ where: { reportDate: TEST_DATE } });
//   await prisma.$disconnect();
// }

// async function main() {
//   if (process.argv.includes("--db")) {
//     await dbRoundTrip();
//   }

//   console.log(failures === 0 ? "\nAll checks passed.\n" : `\n${failures} check(s) failed.\n`);
//   process.exit(failures === 0 ? 0 : 1);
// }

// main();