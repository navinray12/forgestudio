/**
 * CLI Runner for Automated Bulk Template Seeding
 * Command: npx tsx src/scripts/seed-templates/index.ts
 */
import "dotenv/config";
import { seedTemplatePacks } from "./template-seeder.service.js";

async function runCli() {
  try {
    const result = await seedTemplatePacks();
    if (!result.success) {
      console.error("Some template packs failed to seed. Check logs above.");
      process.exit(1);
    }
    process.exit(0);
  } catch (error) {
    console.error("Fatal error running template seeder:", error);
    process.exit(1);
  }
}

runCli();
