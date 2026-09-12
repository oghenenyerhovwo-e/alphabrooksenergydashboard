import "dotenv/config"

import { prisma } from "../src/lib/prisma";
import type { UserRole } from "../src/generated/prisma/client";

const INITIAL_USERS: { entraId: string; name: string; role: UserRole }[] = [
  {
    entraId: "68349eb7-ffbc-42f0-abd3-e9e6efddbb55",
    name: "IT Alphabrooks Energy",
    role: "ADMIN",
  },
  {
    entraId: "f8fc95e8-a5ff-4d4a-af9a-09a468931aed",
    name: "Eke Nwannediya Stephanie",
    role: "ADMIN",
  },
  {
    entraId: "1cf6c525-ba79-4a15-8bf1-7b0eab9437ea",
    name: "Femi-Ademola Oluwatobi",
    role: "BUSINESS_DEVELOPMENT",
  },
  {
    entraId: "48850943-15fc-4867-b05e-b405010a3e64",
    name: "Victor Nnamdi Paul",
    role: "SALES",
  },
  {
    entraId: "a6432b55-ce34-494c-bebd-e2357131e073",
    name: "Ezeilo Sharon",
    role: "OPERATIONS",
  },
  {
    entraId: "09d54739-b698-435d-932b-e3a5fe9f5a91",
    name: "Joseph Regina",
    role: "FINANCE",
  },
];

async function main() {
  for (const u of INITIAL_USERS) {
    const user = await prisma.user.upsert({
      where: { entraId: u.entraId },
      update: { name: u.name, role: u.role },
      create: {
        entraId: u.entraId,
        name: u.name,
        role: u.role,
      },
    });
    console.log(`Seeded user: ${user.name} (${user.role})`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => process.exit(0));