import "dotenv/config";
import { prisma } from "../src/config/prisma.js";

async function main() {
  console.log("Seeding subscription plans...");

  const plans = [
    {
      name: "Free",
      slug: "free",
      price: 0,
      currency: "INR",
      billingInterval: "monthly",
      websiteLimit: 1,
      storageLimitMb: 100,
      aiCreditLimit: 0,
      features: [
        "1 Website",
        "Basic widgets",
        "Basic templates",
        "Basic responsive editing",
        "Basic styling",
        "Basic project saving",
        "Preview",
        "Basic HTML/CSS export",
      ],
    },
    {
      name: "Starter",
      slug: "starter",
      price: 499,
      currency: "INR",
      billingInterval: "monthly",
      websiteLimit: 3,
      storageLimitMb: 1000,
      aiCreditLimit: 100,
      features: [
        "3 Websites",
        "More templates",
        "More widgets",
        "Advanced styling",
        "Custom CSS",
        "More storage (1 GB)",
        "Basic SEO",
        "Code export",
      ],
    },
    {
      name: "Professional",
      slug: "professional",
      price: 999,
      currency: "INR",
      billingInterval: "monthly",
      websiteLimit: 10,
      storageLimitMb: 10000,
      aiCreditLimit: 1000,
      features: [
        "10 Websites",
        "All standard widgets",
        "Advanced widgets",
        "Advanced responsive controls",
        "Global styles",
        "Custom fonts",
        "Advanced CSS",
        "Advanced SEO",
        "AI features / credits",
        "ZIP export",
        "Priority support",
      ],
    },
    {
      name: "Agency",
      slug: "agency",
      price: 2499,
      currency: "INR",
      billingInterval: "monthly",
      websiteLimit: 50,
      storageLimitMb: 50000,
      aiCreditLimit: 5000,
      features: [
        "50 Websites",
        "Client website management capability",
        "Team / client workspace capability",
        "White-label capability",
        "Higher AI limits",
        "Higher storage (50 GB)",
        "Advanced export",
        "Premium support",
      ],
    },
  ];

  const db = prisma as any;

  for (const planData of plans) {
    if (db?.subscriptionPlan?.upsert) {
      const plan = await db.subscriptionPlan.upsert({
        where: { slug: planData.slug },
        update: {
          name: planData.name,
          price: planData.price,
          currency: planData.currency,
          billingInterval: planData.billingInterval,
          websiteLimit: planData.websiteLimit,
          storageLimitMb: planData.storageLimitMb,
          aiCreditLimit: planData.aiCreditLimit,
          features: planData.features,
          isActive: true,
        },
        create: {
          name: planData.name,
          slug: planData.slug,
          price: planData.price,
          currency: planData.currency,
          billingInterval: planData.billingInterval,
          websiteLimit: planData.websiteLimit,
          storageLimitMb: planData.storageLimitMb,
          aiCreditLimit: planData.aiCreditLimit,
          features: planData.features,
          isActive: true,
        },
      });
      console.log(`Plan seeded: ${plan.name} (${plan.slug}) - ₹${plan.price}/mo`);
    } else {
      const featuresJson = JSON.stringify(planData.features);
      await prisma.$executeRawUnsafe(
        `INSERT INTO subscription_plans (id, name, slug, price, currency, "billingInterval", "websiteLimit", "storageLimitMb", "aiCreditLimit", features, "isActive", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, true, NOW(), NOW())
         ON CONFLICT (slug) DO UPDATE SET
           name = EXCLUDED.name,
           price = EXCLUDED.price,
           currency = EXCLUDED.currency,
           "billingInterval" = EXCLUDED."billingInterval",
           "websiteLimit" = EXCLUDED."websiteLimit",
           "storageLimitMb" = EXCLUDED."storageLimitMb",
           "aiCreditLimit" = EXCLUDED."aiCreditLimit",
           features = EXCLUDED.features,
           "isActive" = true,
           "updatedAt" = NOW()`,
        planData.name,
        planData.slug,
        planData.price,
        planData.currency,
        planData.billingInterval,
        planData.websiteLimit,
        planData.storageLimitMb,
        planData.aiCreditLimit,
        featuresJson
      );
      console.log(`Plan seeded (raw): ${planData.name} (${planData.slug}) - ₹${planData.price}/mo`);
    }
  }

  console.log("Subscription plans seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
