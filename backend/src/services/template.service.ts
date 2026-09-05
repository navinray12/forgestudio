import crypto from "crypto";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/app-error.js";

const db = prisma as any;

export const ALLOWED_CATEGORIES = [
  "Landing Page",
  "Business",
  "Portfolio",
  "Blog",
  "Ecommerce",
  "Personal",
  "Other",
];

export function sanitizeCategory(cat?: string): string {
  if (!cat || typeof cat !== "string") return "Other";
  const trimmed = cat.trim();
  const match = ALLOWED_CATEGORIES.find(
    (c) => c.toLowerCase() === trimmed.toLowerCase()
  );
  return match || "Other";
}

/**
 * Ensure templates table exists in PostgreSQL and has category, isFavorite, isShared, and shareToken columns
 */
export async function initTemplateTable() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        type VARCHAR(50) NOT NULL DEFAULT 'PAGE',
        category VARCHAR(100) NOT NULL DEFAULT 'Other',
        "isFavorite" BOOLEAN NOT NULL DEFAULT FALSE,
        "isShared" BOOLEAN NOT NULL DEFAULT FALSE,
        "shareToken" VARCHAR(255),
        "templateData" JSONB NOT NULL DEFAULT '{"elements":[],"pageSettings":{}}'::jsonb,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE templates ADD COLUMN IF NOT EXISTS category VARCHAR(100) NOT NULL DEFAULT 'Other';
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE templates ADD COLUMN IF NOT EXISTS "isFavorite" BOOLEAN NOT NULL DEFAULT FALSE;
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE templates ADD COLUMN IF NOT EXISTS "isShared" BOOLEAN NOT NULL DEFAULT FALSE;
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE templates ADD COLUMN IF NOT EXISTS "shareToken" VARCHAR(255);
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_templates_user_id ON templates("userId");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_templates_share_token ON templates("shareToken");
    `);
  } catch (error) {
    console.error("Template table initialization log:", error);
  }
}

// Auto-run initialization
initTemplateTable();

export interface CreateTemplateParams {
  name: string;
  description?: string;
  type?: string;
  category?: string;
  isFavorite?: boolean;
  isShared?: boolean;
  shareToken?: string;
  templateData: {
    elements: any[];
    pageSettings: any;
  };
}

/**
 * Create a reusable design template for the authenticated user
 */
export async function createTemplate(userId: string, params: CreateTemplateParams) {
  const trimmedName = params.name?.trim();
  if (!trimmedName) {
    throw new AppError("Template name is required", 400, "INVALID_TEMPLATE_NAME");
  }

  const description = params.description?.trim() || null;
  const type = (params.type?.trim() || "PAGE").toUpperCase();
  const category = sanitizeCategory(params.category);
  const isFavorite = params.isFavorite === true;
  const isShared = params.isShared === true;
  const shareToken = params.shareToken || null;
  const templateData = params.templateData || { elements: [], pageSettings: {} };

  try {
    if (db?.template?.create) {
      const newTemplate = await db.template.create({
        data: {
          userId,
          name: trimmedName,
          description,
          type,
          category,
          isFavorite,
          isShared,
          shareToken,
          templateData,
        },
      });
      return newTemplate;
    }

    // Raw SQL Fallback
    const jsonStr = JSON.stringify(templateData);
    const created: any[] = await prisma.$queryRaw`
      INSERT INTO templates (id, "userId", name, description, type, category, "isFavorite", "isShared", "shareToken", "templateData", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), ${userId}::uuid, ${trimmedName}, ${description}, ${type}, ${category}, ${isFavorite}, ${isShared}, ${shareToken}, ${jsonStr}::jsonb, NOW(), NOW())
      RETURNING id, "userId", name, description, type, category, "isFavorite", "isShared", "shareToken", "templateData", "createdAt", "updatedAt"
    `;

    return created[0];
  } catch (error) {
    console.error("Error creating template:", error);
    throw new AppError("Failed to save template", 500, "CREATE_TEMPLATE_FAILED");
  }
}

/**
 * Get all saved templates for a user
 */
export async function getUserTemplates(userId: string) {
  try {
    if (db?.template?.findMany) {
      const templates = await db.template.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });
      if (templates) return templates;
    }

    const rawTemplates: any[] = await prisma.$queryRaw`
      SELECT id, "userId", name, description, type, category, "isFavorite", "isShared", "shareToken", "templateData", "createdAt", "updatedAt"
      FROM templates
      WHERE "userId" = ${userId}::uuid
      ORDER BY "createdAt" DESC
    `;
    return rawTemplates || [];
  } catch (error) {
    console.error("Error fetching user templates:", error);
    return [];
  }
}

export interface UpdateTemplateParams {
  name?: string;
  description?: string;
  category?: string;
  isFavorite?: boolean;
  isShared?: boolean;
  shareToken?: string | null;
  templateData?: {
    elements: any[];
    pageSettings: any;
  };
}

/**
 * Update template metadata & design data for authenticated user
 */
export async function updateTemplate(
  userId: string,
  templateId: string,
  params: UpdateTemplateParams
) {
  const trimmedName = params.name?.trim();
  if (params.name !== undefined && !trimmedName) {
    throw new AppError("Template name cannot be empty", 400, "INVALID_TEMPLATE_NAME");
  }

  const description = params.description !== undefined ? params.description.trim() : undefined;
  const category = params.category !== undefined ? sanitizeCategory(params.category) : undefined;
  const isFavorite = typeof params.isFavorite === "boolean" ? params.isFavorite : undefined;
  const isShared = typeof params.isShared === "boolean" ? params.isShared : undefined;
  const shareToken = params.shareToken !== undefined ? params.shareToken : undefined;
  const templateData = params.templateData !== undefined ? params.templateData : undefined;

  try {
    if (db?.template?.findFirst && db?.template?.update) {
      const existing = await db.template.findFirst({
        where: { id: templateId, userId },
      });
      if (!existing) {
        throw new AppError("Template not found or unauthorized", 404, "TEMPLATE_NOT_FOUND");
      }

      const updated = await db.template.update({
        where: { id: templateId },
        data: {
          ...(trimmedName ? { name: trimmedName } : {}),
          ...(description !== undefined ? { description } : {}),
          ...(category !== undefined ? { category } : {}),
          ...(isFavorite !== undefined ? { isFavorite } : {}),
          ...(isShared !== undefined ? { isShared } : {}),
          ...(shareToken !== undefined ? { shareToken } : {}),
          ...(templateData !== undefined ? { templateData } : {}),
          updatedAt: new Date(),
        },
      });
      return updated;
    }

    // Raw SQL Fallback
    const existingRaw: any[] = await prisma.$queryRaw`
      SELECT id FROM templates WHERE id = ${templateId}::uuid AND "userId" = ${userId}::uuid
    `;
    if (!existingRaw || existingRaw.length === 0) {
      throw new AppError("Template not found or unauthorized", 404, "TEMPLATE_NOT_FOUND");
    }

    const templateDataJson = templateData ? JSON.stringify(templateData) : null;

    const updatedRaw: any[] = await prisma.$queryRaw`
      UPDATE templates
      SET name = COALESCE(${trimmedName}, name),
          description = COALESCE(${description}, description),
          category = COALESCE(${category}, category),
          "isFavorite" = COALESCE(${isFavorite}, "isFavorite"),
          "isShared" = COALESCE(${isShared}, "isShared"),
          "shareToken" = COALESCE(${shareToken}, "shareToken"),
          "templateData" = CASE WHEN ${templateDataJson}::text IS NOT NULL THEN ${templateDataJson}::jsonb ELSE "templateData" END,
          "updatedAt" = NOW()
      WHERE id = ${templateId}::uuid AND "userId" = ${userId}::uuid
      RETURNING id, "userId", name, description, type, category, "isFavorite", "isShared", "shareToken", "templateData", "createdAt", "updatedAt"
    `;

    return updatedRaw[0];
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error("Error updating template:", error);
    throw new AppError("Unable to update template", 500, "UPDATE_TEMPLATE_FAILED");
  }
}

/**
 * Enable or disable template sharing for an authorized user
 */
export async function toggleTemplateShareStatus(
  userId: string,
  templateId: string,
  isShared: boolean
) {
  const existingRaw: any[] = await prisma.$queryRaw`
    SELECT id, "shareToken", "isShared" FROM templates WHERE id = ${templateId}::uuid AND "userId" = ${userId}::uuid
  `;
  if (!existingRaw || existingRaw.length === 0) {
    throw new AppError("Template not found or unauthorized", 404, "TEMPLATE_NOT_FOUND");
  }

  let shareToken = existingRaw[0].shareToken;
  if (isShared && !shareToken) {
    shareToken = crypto.randomUUID();
  }

  return updateTemplate(userId, templateId, {
    isShared,
    shareToken,
  });
}

/**
 * Retrieve public shared template safely without exposing private user data
 */
export async function getPublicTemplateByToken(shareToken: string) {
  if (!shareToken || typeof shareToken !== "string") {
    throw new AppError("This template is no longer available.", 404, "TEMPLATE_NOT_FOUND");
  }

  try {
    if (db?.template?.findFirst) {
      const template = await db.template.findFirst({
        where: { shareToken, isShared: true },
      });
      if (template) {
        const { userId, ...safeTemplate } = template;
        return safeTemplate;
      }
    }

    const raw: any[] = await prisma.$queryRaw`
      SELECT id, name, description, type, category, "isFavorite", "isShared", "shareToken", "templateData", "createdAt", "updatedAt"
      FROM templates
      WHERE "shareToken" = ${shareToken} AND "isShared" = TRUE
    `;

    if (!raw || raw.length === 0) {
      throw new AppError("This template is no longer available.", 404, "TEMPLATE_NOT_FOUND");
    }

    return raw[0];
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error("Error fetching public template:", error);
    throw new AppError("This template is no longer available.", 404, "TEMPLATE_NOT_FOUND");
  }
}

/**
 * Delete a saved template owned by authenticated user
 */
export async function deleteTemplate(userId: string, templateId: string) {
  try {
    if (db?.template?.deleteMany) {
      const result = await db.template.deleteMany({
        where: { id: templateId, userId },
      });
      if (result.count === 0) {
        throw new AppError("Template not found or unauthorized", 404, "TEMPLATE_NOT_FOUND");
      }
      return { id: templateId };
    }

    const result: any[] = await prisma.$queryRaw`
      DELETE FROM templates
      WHERE id = ${templateId}::uuid AND "userId" = ${userId}::uuid
      RETURNING id
    `;

    if (!result || result.length === 0) {
      throw new AppError("Template not found or unauthorized", 404, "TEMPLATE_NOT_FOUND");
    }

    return { id: templateId };
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error("Error deleting template:", error);
    throw new AppError("Unable to delete template", 500, "DELETE_TEMPLATE_FAILED");
  }
}
