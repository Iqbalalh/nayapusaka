/* eslint-disable no-console */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const connectionString = `${process.env.DATABASE_URL}`;

const adapter = new PrismaPg({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

const prisma = new PrismaClient({ adapter });

/**
 * Seeder untuk menambahkan regionId ke tabel homes
 * 
 * Logic:
 * - Jika home memiliki wali, gunakan regionId dari employee yang terhubung ke wali tersebut
 * - Jika tidak ada wali, gunakan regionId dari partner yang terhubung ke home tersebut
 */
async function seedHomesRegion() {
  console.log("🌱 Starting seeder: Update regionId in homes table...");

  try {
    // Ambil semua homes yang belum memiliki regionId
    const homesWithoutRegion = await prisma.homes.findMany({
      where: {
        regionId: null,
      },
      include: {
        partners: true,
        wali: {
          include: {
            employees: true,
          },
        },
      },
    });

    console.log(`📊 Found ${homesWithoutRegion.length} homes without regionId`);

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const home of homesWithoutRegion) {
      let regionId: number | null = null;
      let source: string = "";

      // Prioritas 1: Gunakan regionId dari wali jika ada
      if (home.waliId && home.wali) {
        if (home.wali.employees && home.wali.employees.regionId) {
          regionId = home.wali.employees.regionId;
          source = "wali's employee";
        }
      }

      // Prioritas 2: Gunakan regionId dari partner jika tidak ada wali atau wali tidak memiliki regionId
      if (!regionId && home.partnerId && home.partners) {
        if (home.partners.regionId) {
          regionId = home.partners.regionId;
          source = "partner";
        }
      }

      // Update home jika regionId ditemukan
      if (regionId) {
        await prisma.homes.update({
          where: {
            id: home.id,
          },
          data: {
            regionId: regionId,
          },
        });

        console.log(`✅ Home ID ${home.id}: Updated regionId to ${regionId} (from ${source})`);
        updatedCount++;
      } else {
        console.log(`⚠️  Home ID ${home.id}: Skipped - No regionId found (waliId: ${home.waliId}, partnerId: ${home.partnerId})`);
        skippedCount++;
      }
    }

    console.log("\n📈 Summary:");
    console.log(`   ✅ Updated: ${updatedCount} homes`);
    console.log(`   ⚠️  Skipped: ${skippedCount} homes (no regionId found)`);
    console.log(`   ❌ Errors:  ${errorCount} homes`);
    console.log("\n🎉 Seeder completed successfully!");
  } catch (error) {
    console.error("❌ Error during seeder execution:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Jalankan seeder
seedHomesRegion()
  .then(() => {
    console.log("\n✨ Seeder finished");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Seeder failed:", error);
    process.exit(1);
  });
