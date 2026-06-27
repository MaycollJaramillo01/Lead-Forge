import { PrismaClient } from "@prisma/client";
import { INDUSTRIES } from "../src/lib/industry/map";

const prisma = new PrismaClient();

async function main() {
  for (const ind of INDUSTRIES) {
    await prisma.category.upsert({
      where: { id: ind.slug },
      update: {
        name: ind.name,
        naicsCode: ind.naics,
        osmTags: ind.osm as unknown as object,
      },
      create: {
        id: ind.slug,
        name: ind.name,
        naicsCode: ind.naics,
        osmTags: ind.osm as unknown as object,
      },
    });
    console.log(`seeded category: ${ind.slug} (NAICS ${ind.naics})`);
  }
  console.log(`Done. ${INDUSTRIES.length} categories.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
