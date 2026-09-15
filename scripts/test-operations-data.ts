import "dotenv/config"

import { getOperationsTeamData } from "@/lib/operations/team-data";

getOperationsTeamData().then((data) => {
  console.log(JSON.stringify(data, null, 2));
});