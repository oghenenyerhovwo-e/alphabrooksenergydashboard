import "dotenv/config";
import assert from "node:assert/strict";
import {
  calculateAchievementPercentage,
  calculateOutstanding,
  calculateTeamTarget,
  calculateTeamAchievement,
  calculateTeamOutstanding,
  calculateTeamAchievementPercentage,
  calculateContributionPercentage,
} from "@/lib/outcomes/calculations";

let passed = 0;
function check(label: string, actual: unknown, expected: unknown) {
  assert.deepStrictEqual(actual, expected, `${label}: expected ${expected}, got ${actual}`);
  passed++;
  console.log(`  ok — ${label}`);
}

console.log("Achievement percentage");
check("0%", calculateAchievementPercentage(0, 100000), 0);
check("50%", calculateAchievementPercentage(50000, 100000), 50);
check("100%", calculateAchievementPercentage(100000, 100000), 100);
check("115% (over target, not capped)", calculateAchievementPercentage(115000, 100000), 115);
check("target = 0 -> null", calculateAchievementPercentage(50000, 0), null);
check("negative target -> null", calculateAchievementPercentage(50000, -10), null);
check("missing achievement -> null", calculateAchievementPercentage(null, 100000), null);

console.log("Outstanding");
check("achievement > target -> 0 (never negative)", calculateOutstanding(100000, 115000), 0);
check("normal shortfall", calculateOutstanding(100000, 40000), 60000);
check("exact match -> 0", calculateOutstanding(100000, 100000), 0);
check("missing achievement -> full target outstanding", calculateOutstanding(100000, null), 100000);

console.log("Team target / achievement");
check("team target sums", calculateTeamTarget([100000, 50000, 25000]), 175000);
check("team achievement ignores missing", calculateTeamAchievement([50000, null, 25000]), 75000);
check("team achievement: all missing -> null", calculateTeamAchievement([null, null]), null);
check("team achievement: zero achievement -> 0, not null", calculateTeamAchievement([0, 0]), 0);
check("team achievement: empty roster -> null", calculateTeamAchievement([]), null);

console.log("Team outstanding / percentage");
check("team outstanding", calculateTeamOutstanding(175000, 75000), 100000);
check("team achievement % zero team target -> null", calculateTeamAchievementPercentage(75000, 0), null);
check("team achievement % zero team achievement -> 0%", calculateTeamAchievementPercentage(0, 175000), 0);

console.log("Contribution");
check("normal contribution", calculateContributionPercentage(25000, 75000), 33.33);
check("individual missing -> null", calculateContributionPercentage(null, 75000), null);
check("team achievement missing -> null", calculateContributionPercentage(25000, null), null);
check("zero team achievement -> null (not division-safe 0)", calculateContributionPercentage(0, 0), null);

console.log(`\n${passed} outcomes-calculation checks passed.`);