/**
 * Automated Bulk Template Seeding Service
 * Idempotent seeder that populates PostgreSQL with 10 complete website template packs,
 * pages, reusable header/footer components, and popups.
 */

import { prisma } from "../../platform/database/prisma.js";
import { ALL_TEMPLATE_PACKS } from "./template-packs/index.js";

const db = prisma as any;

export interface SeedingResult {
  success: boolean;
  totalPacks: number;
  totalTemplatesCreatedOrUpdated: number;
  totalChildPages: number;
  totalHeaders: number;
  totalFooters: number;
  totalPopups: number;
  errors: Array<{ packId: string; error: string }>;
  durationMs: number;
}

/**
 * Ensures a system administrator user exists for owning global seeded templates
 */
async function getOrCreateSystemSeedUser(): Promise<string> {
  // 1. Try to find any existing ADMIN / SUPER_ADMIN or standard user
  if (db?.user?.findFirst) {
    const existingAdmin = await db.user.findFirst({
      where: { role: { in: ["ADMIN", "SUPER_ADMIN", "USER"] } },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (existingAdmin) return existingAdmin.id;
  } else {
    const rawUsers: any[] = await prisma.$queryRaw`
      SELECT id FROM users LIMIT 1
    `;
    if (rawUsers && rawUsers.length > 0) return rawUsers[0].id;
  }

  // 2. Create system admin user if database is completely fresh
  const systemEmail = "system.templates@forgestudio.io";
  if (db?.user?.create) {
    const createdUser = await db.user.create({
      data: {
        email: systemEmail,
        fullName: "ForgeStudio Template Registry",
        role: "ADMIN",
        status: "ACTIVE",
        emailVerified: true,
      },
    });
    return createdUser.id;
  }

  const rawCreated: any[] = await prisma.$queryRaw`
    INSERT INTO users (id, email, "fullName", role, status, "emailVerified", "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), ${systemEmail}, 'ForgeStudio Template Registry', 'ADMIN', 'ACTIVE', true, NOW(), NOW())
    RETURNING id
  `;
  return rawCreated[0].id;
}

/**
 * Helper to upsert a template record idempotently by shareToken
 */
async function upsertTemplateRecord(params: {
  userId: string;
  name: string;
  description: string;
  type: string;
  category: string;
  isFavorite: boolean;
  isShared: boolean;
  shareToken: string;
  templateData: any;
}): Promise<void> {
  const jsonStr = JSON.stringify(params.templateData);

  // Check if template with this shareToken already exists
  const existingRows: any[] = await prisma.$queryRaw`
    SELECT id FROM templates WHERE "shareToken" = ${params.shareToken} LIMIT 1
  `;

  if (existingRows && existingRows.length > 0) {
    await prisma.$executeRawUnsafe(
      `UPDATE templates
       SET name = $1,
           description = $2,
           type = $3,
           category = $4,
           "isFavorite" = $5,
           "isShared" = $6,
           "templateData" = $7::jsonb,
           "updatedAt" = NOW()
       WHERE "shareToken" = $8`,
      params.name,
      params.description,
      params.type,
      params.category,
      params.isFavorite,
      params.isShared,
      jsonStr,
      params.shareToken
    );
  } else {
    await prisma.$executeRawUnsafe(
      `INSERT INTO templates (id, "userId", name, description, type, category, "isFavorite", "isShared", "shareToken", "templateData", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1::uuid, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, NOW(), NOW())`,
      params.userId,
      params.name,
      params.description,
      params.type,
      params.category,
      params.isFavorite,
      params.isShared,
      params.shareToken,
      jsonStr
    );
  }
}

/**
 * Execute the automated bulk template seeding process (idempotent)
 */
export async function seedTemplatePacks(): Promise<SeedingResult> {
  const startTime = Date.now();
  console.log("=================================================");
  console.log("STARTING FORGESTUDIO BULK TEMPLATE PACK SEEDING");
  console.log(`Discovered ${ALL_TEMPLATE_PACKS.length} template packs to seed`);
  console.log("=================================================");

  const userId = await getOrCreateSystemSeedUser();
  console.log(`Using system template owner ID: ${userId}`);

  let totalTemplatesCreatedOrUpdated = 0;
  let totalChildPages = 0;
  let totalHeaders = 0;
  let totalFooters = 0;
  let totalPopups = 0;
  const errors: Array<{ packId: string; error: string }> = [];

  for (const pack of ALL_TEMPLATE_PACKS) {
    try {
      console.log(`--> Seeding pack: ${pack.name} (${pack.id}) [${pack.category}]...`);

      // 1. Seed the Complete Website Kit Template
      const kitTemplateData = {
        id: pack.id,
        slug: pack.slug,
        name: pack.name,
        category: pack.category,
        description: pack.description,
        thumbnail: pack.thumbnail,
        globalStyles: pack.globalStyles,
        siteParts: pack.siteParts,
        popups: pack.popups || [],
        pages: pack.pages || [],
      };

      await upsertTemplateRecord({
        userId,
        name: pack.name,
        description: pack.description,
        type: "KIT",
        category: pack.category,
        isFavorite: true,
        isShared: true,
        shareToken: pack.slug,
        templateData: kitTemplateData,
      });

      totalTemplatesCreatedOrUpdated++;

      // 2. Seed Each Individual Page as a Standalone PAGE Template
      for (const page of pack.pages) {
        const pageTitle = (page as any).title || page.name;
        const pageTemplateData = {
          elements: page.elements || [],
          pageSettings: {
            title: `${pack.name} - ${pageTitle}`,
            slug: page.slug,
            globalStyles: pack.globalStyles,
          },
        };

        await upsertTemplateRecord({
          userId,
          name: `${pack.name} — ${pageTitle}`,
          description: `${pageTitle} page from the ${pack.name} website template pack`,
          type: "PAGE",
          category: pack.category,
          isFavorite: page.slug === "home",
          isShared: true,
          shareToken: `${pack.slug}-page-${page.slug}`,
          templateData: pageTemplateData,
        });

        totalChildPages++;
        totalTemplatesCreatedOrUpdated++;
      }

      // 3. Seed Individual Reusable Header Component if present
      if (pack.siteParts?.header?.elements && pack.siteParts.header.elements.length > 0) {
        const headerData = {
          elements: pack.siteParts.header.elements,
          globalStyles: pack.globalStyles,
        };
        await upsertTemplateRecord({
          userId,
          name: `${pack.name} — Global Header`,
          description: `Reusable global navigation header from ${pack.name}`,
          type: "HEADER",
          category: pack.category,
          isFavorite: false,
          isShared: true,
          shareToken: `${pack.slug}-header`,
          templateData: headerData,
        });
        totalHeaders++;
        totalTemplatesCreatedOrUpdated++;
      }

      // 4. Seed Individual Reusable Footer Component if present
      if (pack.siteParts?.footer?.elements && pack.siteParts.footer.elements.length > 0) {
        const footerData = {
          elements: pack.siteParts.footer.elements,
          globalStyles: pack.globalStyles,
        };
        await upsertTemplateRecord({
          userId,
          name: `${pack.name} — Global Footer`,
          description: `Reusable multi-column footer from ${pack.name}`,
          type: "FOOTER",
          category: pack.category,
          isFavorite: false,
          isShared: true,
          shareToken: `${pack.slug}-footer`,
          templateData: footerData,
        });
        totalFooters++;
        totalTemplatesCreatedOrUpdated++;
      }

      // 5. Seed Individual Reusable Popups if present
      if (pack.popups && pack.popups.length > 0) {
        for (const pop of pack.popups) {
          const popupData = {
            id: pop.id,
            name: pop.name,
            triggerType: pop.triggerType,
            triggerDelay: (pop as any).triggerDelay,
            triggerScrollPercent: (pop as any).triggerScrollPercent,
            elements: pop.elements,
          };
          await upsertTemplateRecord({
            userId,
            name: `${pack.name} — ${pop.name}`,
            description: `Lead capture modal popup from ${pack.name}`,
            type: "POPUP",
            category: pack.category,
            isFavorite: false,
            isShared: true,
            shareToken: `${pack.slug}-${pop.id}`,
            templateData: popupData,
          });
          totalPopups++;
          totalTemplatesCreatedOrUpdated++;
        }
      }


      console.log(`   [✓] Pack "${pack.name}" seeded with ${pack.pages.length} pages`);
    } catch (err: any) {
      console.error(`   [✗] Error seeding pack "${pack.name}":`, err?.message || err);
      errors.push({ packId: pack.id, error: err?.message || String(err) });
    }
  }

  const durationMs = Date.now() - startTime;
  console.log("=================================================");
  console.log("BULK TEMPLATE SEEDING COMPLETED");
  console.log(`Total Packs Processed: ${ALL_TEMPLATE_PACKS.length}`);
  console.log(`Total Database Records Created/Updated: ${totalTemplatesCreatedOrUpdated}`);
  console.log(`Total Child Pages Created: ${totalChildPages}`);
  console.log(`Total Headers: ${totalHeaders}`);
  console.log(`Total Footers: ${totalFooters}`);
  console.log(`Total Popups: ${totalPopups}`);
  console.log(`Errors Encountered: ${errors.length}`);
  console.log(`Execution Time: ${durationMs}ms`);
  console.log("=================================================");

  return {
    success: errors.length === 0,
    totalPacks: ALL_TEMPLATE_PACKS.length,
    totalTemplatesCreatedOrUpdated,
    totalChildPages,
    totalHeaders,
    totalFooters,
    totalPopups,
    errors,
    durationMs,
  };
}
