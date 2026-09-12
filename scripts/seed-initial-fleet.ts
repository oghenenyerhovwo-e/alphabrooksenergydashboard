import "dotenv/config"

import { prisma } from "../src/lib/prisma";

async function main() {
  const driver = await prisma.driver.findFirst({
    where: { name: "Celestine" },
  });

  const finalDriver =
    driver ??
    (await prisma.driver.create({
      data: {
        name: "Celestine",
        phone: null, // add a phone number string here if you have one
        active: true,
      },
    }));

  const vehicle = await prisma.vehicle.upsert({
    where: { plateNumber: "REPLACE-WITH-PLATE-NUMBER" },
    update: {},
    create: {
      plateNumber: "REPLACE-WITH-PLATE-NUMBER",
      active: true,
    },
  });

  console.log("Driver:", finalDriver);
  console.log("Vehicle:", vehicle);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => process.exit(0));