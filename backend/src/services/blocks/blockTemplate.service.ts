import { prisma } from "../../config/prisma.js";
import { BlockNode, validateAndNormalizeBlock } from "./blockEngine.service.js";

export type TemplateType = "single" | "page" | "archive" | "404" | "front-page" | "custom";
export type TemplateLockMode = "all" | "insert" | "contentOnly" | false;

export interface CreateTemplateInput {
  slug: string;
  title: string;
  description?: string;
  type?: TemplateType;
  content: BlockNode[];
  templateLock?: TemplateLockMode;
  isDefault?: boolean;
  assignedPageIds?: string[];
  workspaceId?: string | null;
  organizationId?: string | null;
  userId: string;
}

export interface UpdateTemplateInput {
  title?: string;
  description?: string;
  type?: TemplateType;
  content?: BlockNode[];
  templateLock?: TemplateLockMode;
  isDefault?: boolean;
  assignedPageIds?: string[];
}

export class BlockTemplateService {
  /**
   * Create a new Block Template.
   */
  static async createTemplate(input: CreateTemplateInput) {
    const db = prisma as any;
    const normalizedBlocks: BlockNode[] = [];

    if (Array.isArray(input.content)) {
      for (const block of input.content) {
        const validation = validateAndNormalizeBlock(block);
        if (!validation.valid) {
          throw new Error(`Invalid block in template creation: ${validation.errors.join(", ")}`);
        }
        if (validation.sanitizedBlock) {
          normalizedBlocks.push(validation.sanitizedBlock);
        }
      }
    }

    return db.blockTemplate.create({
      data: {
        slug: input.slug,
        title: input.title,
        description: input.description,
        type: input.type || "custom",
        content: normalizedBlocks as any,
        templateLock: input.templateLock ? String(input.templateLock) : null,
        isDefault: !!input.isDefault,
        assignedPageIds: input.assignedPageIds || [],
        workspaceId: input.workspaceId || null,
        organizationId: input.organizationId || null,
        userId: input.userId,
        version: 1,
      },
    });
  }

  /**
   * List Block Templates with tenant scoping.
   */
  static async listTemplates(filter: {
    workspaceId?: string;
    type?: TemplateType;
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

    if (filter.type) {
      where.type = filter.type;
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

    return db.blockTemplate.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Resolve template for page by WordPress hierarchy precedence:
   * 1. Assigned custom template ID/slug
   * 2. Specific Page Slug match (e.g. page-about)
   * 3. Default Page Template (type: "page", isDefault: true)
   * 4. Single Post Template (type: "single")
   * 5. Fallback Index Template
   */
  static async resolveTemplateForPage(page: {
    id: string;
    slug?: string;
    customTemplateSlug?: string;
    workspaceId?: string;
  }) {
    const db = prisma as any;
    const workspaceId = page.workspaceId;

    // 1. Custom template slug
    if (page.customTemplateSlug) {
      const custom = await db.blockTemplate.findFirst({
        where: { slug: page.customTemplateSlug, workspaceId: workspaceId || null },
      });
      if (custom) return custom;
    }

    // 2. Specific page slug match (page-{slug})
    if (page.slug) {
      const specific = await db.blockTemplate.findFirst({
        where: { slug: `page-${page.slug}`, workspaceId: workspaceId || null },
      });
      if (specific) return specific;
    }

    // 3. Assigned page ID match
    const assigned = await db.blockTemplate.findFirst({
      where: { assignedPageIds: { has: page.id }, workspaceId: workspaceId || null },
    });
    if (assigned) return assigned;

    // 4. Default page template
    const defaultPage = await db.blockTemplate.findFirst({
      where: { type: "page", isDefault: true, workspaceId: workspaceId || null },
    });
    if (defaultPage) return defaultPage;

    // 5. Fallback any page template or custom template
    return db.blockTemplate.findFirst({
      where: { workspaceId: workspaceId || null },
      orderBy: { createdAt: "asc" },
    });
  }

  /**
   * Validate template locking policy (`"all"`, `"insert"`, `"contentOnly"`).
   */
  static validateTemplateLockAction(
    templateLock: TemplateLockMode,
    action: "insert" | "delete" | "reorder" | "editContent"
  ): { allowed: boolean; reason?: string } {
    if (!templateLock) return { allowed: true };

    if (templateLock === "all") {
      return { allowed: false, reason: "Template is locked for all modifications (lock: 'all')." };
    }

    if (templateLock === "insert" && (action === "insert" || action === "delete")) {
      return { allowed: false, reason: "Template is locked against inserting or deleting blocks (lock: 'insert')." };
    }

    if (templateLock === "contentOnly" && action !== "editContent") {
      return { allowed: false, reason: "Template only allows content edits; structural changes locked (lock: 'contentOnly')." };
    }

    return { allowed: true };
  }

  /**
   * Update template.
   */
  static async updateTemplate(id: string, input: UpdateTemplateInput) {
    const db = prisma as any;
    const existing = await db.blockTemplate.findUnique({ where: { id } });
    if (!existing) throw new Error("Block template not found");

    const data: any = { version: existing.version + 1 };
    if (input.title !== undefined) data.title = input.title;
    if (input.description !== undefined) data.description = input.description;
    if (input.type !== undefined) data.type = input.type;
    if (input.templateLock !== undefined) data.templateLock = input.templateLock ? String(input.templateLock) : null;
    if (input.isDefault !== undefined) data.isDefault = input.isDefault;
    if (input.assignedPageIds !== undefined) data.assignedPageIds = input.assignedPageIds;

    if (Array.isArray(input.content)) {
      const normalizedBlocks: BlockNode[] = [];
      for (const block of input.content) {
        const validation = validateAndNormalizeBlock(block);
        if (!validation.valid) {
          throw new Error(`Invalid block in template update: ${validation.errors.join(", ")}`);
        }
        if (validation.sanitizedBlock) {
          normalizedBlocks.push(validation.sanitizedBlock);
        }
      }
      data.content = normalizedBlocks as any;
    }

    return db.blockTemplate.update({ where: { id }, data });
  }

  /**
   * Delete template.
   */
  static async deleteTemplate(id: string) {
    const db = prisma as any;
    return db.blockTemplate.delete({ where: { id } });
  }
}
