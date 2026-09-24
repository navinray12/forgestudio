import { prisma } from "../../config/prisma.js";
import { BlockNode, validateAndNormalizeBlock } from "./blockEngine.service.js";

export type TemplatePartArea = "header" | "footer" | "sidebar" | "content" | "navigation" | "custom" | "uncategorized";

export interface CreateTemplatePartInput {
  slug: string;
  title: string;
  area?: TemplatePartArea;
  content: BlockNode[];
  workspaceId?: string | null;
  organizationId?: string | null;
  userId: string;
}

export interface UpdateTemplatePartInput {
  title?: string;
  area?: TemplatePartArea;
  content?: BlockNode[];
}

export class TemplatePartService {
  /**
   * Create Template Part.
   */
  static async createTemplatePart(input: CreateTemplatePartInput) {
    const db = prisma as any;
    const normalizedBlocks: BlockNode[] = [];

    if (Array.isArray(input.content)) {
      for (const block of input.content) {
        const validation = validateAndNormalizeBlock(block);
        if (!validation.valid) {
          throw new Error(`Invalid block in template part creation: ${validation.errors.join(", ")}`);
        }
        if (validation.sanitizedBlock) {
          normalizedBlocks.push(validation.sanitizedBlock);
        }
      }
    }

    return db.templatePart.create({
      data: {
        slug: input.slug,
        title: input.title,
        area: input.area || "uncategorized",
        content: normalizedBlocks as any,
        workspaceId: input.workspaceId || null,
        organizationId: input.organizationId || null,
        userId: input.userId,
        version: 1,
      },
    });
  }

  /**
   * List Template Parts by area or search.
   */
  static async listTemplateParts(filter: {
    workspaceId?: string;
    area?: TemplatePartArea;
    search?: string;
  }) {
    const db = prisma as any;
    const where: any = {};

    if (filter.workspaceId) {
      where.OR = [
        { workspaceId: filter.workspaceId },
        { workspaceId: null },
      ];
    }

    if (filter.area) {
      where.area = filter.area;
    }

    if (filter.search) {
      where.AND = [
        {
          OR: [
            { title: { contains: filter.search, mode: "insensitive" } },
            { slug: { contains: filter.search, mode: "insensitive" } },
          ],
        },
      ];
    }

    return db.templatePart.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Get template part by slug or ID.
   */
  static async getTemplatePartBySlug(slug: string, workspaceId?: string) {
    const db = prisma as any;
    return db.templatePart.findFirst({
      where: {
        slug,
        OR: [
          { workspaceId: workspaceId || null },
          { workspaceId: null },
        ],
      },
    });
  }

  /**
   * Update Template Part.
   */
  static async updateTemplatePart(id: string, input: UpdateTemplatePartInput) {
    const db = prisma as any;
    const existing = await db.templatePart.findUnique({ where: { id } });
    if (!existing) throw new Error("Template part not found");

    const data: any = { version: existing.version + 1 };
    if (input.title !== undefined) data.title = input.title;
    if (input.area !== undefined) data.area = input.area;

    if (Array.isArray(input.content)) {
      const normalizedBlocks: BlockNode[] = [];
      for (const block of input.content) {
        const validation = validateAndNormalizeBlock(block);
        if (!validation.valid) {
          throw new Error(`Invalid block in template part update: ${validation.errors.join(", ")}`);
        }
        if (validation.sanitizedBlock) {
          normalizedBlocks.push(validation.sanitizedBlock);
        }
      }
      data.content = normalizedBlocks as any;
    }

    return db.templatePart.update({ where: { id }, data });
  }

  /**
   * Delete Template Part.
   */
  static async deleteTemplatePart(id: string) {
    const db = prisma as any;
    return db.templatePart.delete({ where: { id } });
  }
}
