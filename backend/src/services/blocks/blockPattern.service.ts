import { prisma } from "../../config/prisma.js";
import { BlockNode, validateAndNormalizeBlock } from "./blockEngine.service.js";

export interface CreatePatternInput {
  name: string;
  title: string;
  description?: string;
  category?: string;
  categories?: string[];
  content: BlockNode[];
  viewportWidth?: number;
  blockTypes?: string[];
  keywords?: string[];
  isSynced?: boolean;
  workspaceId?: string;
  organizationId?: string;
  userId: string;
}

export interface UpdatePatternInput {
  title?: string;
  description?: string;
  category?: string;
  categories?: string[];
  content?: BlockNode[];
  viewportWidth?: number;
  blockTypes?: string[];
  keywords?: string[];
  isSynced?: boolean;
  syncStatus?: string;
}

export class BlockPatternService {
  /**
   * Create a new block pattern or synced pattern.
   */
  async createPattern(input: CreatePatternInput) {
    const categories = input.categories || [input.category || "general"];
    const normalizedBlocks: BlockNode[] = [];

    if (Array.isArray(input.content)) {
      for (const block of input.content) {
        const validation = validateAndNormalizeBlock(block);
        if (!validation.valid) {
          throw new Error(`Invalid block in pattern: ${validation.errors.join(", ")}`);
        }
        if (validation.sanitizedBlock) {
          normalizedBlocks.push(validation.sanitizedBlock);
        }
      }
    }

    const db = prisma as any;
    const pattern = await db.blockPattern.create({
      data: {
        name: input.name,
        title: input.title,
        description: input.description,
        category: input.category || "general",
        categories: categories,
        content: normalizedBlocks as any,
        viewportWidth: input.viewportWidth || 1200,
        blockTypes: input.blockTypes || [],
        keywords: input.keywords || [],
        isSynced: !!input.isSynced,
        workspaceId: input.workspaceId || null,
        organizationId: input.organizationId || null,
        userId: input.userId,
        version: 1,
      },
    });

    if (pattern.isSynced) {
      await db.syncedPatternRevision.create({
        data: {
          patternId: pattern.id,
          version: 1,
          title: pattern.title,
          content: pattern.content as any,
          description: "Initial synced pattern creation",
          createdBy: input.userId,
        },
      });
    }

    return pattern;
  }

  /**
   * List block patterns with category filtering, search, and tenant isolation.
   */
  async listPatterns(filter: {
    workspaceId?: string;
    organizationId?: string;
    category?: string;
    isSynced?: boolean;
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

    if (filter.category) {
      where.category = filter.category;
    }

    if (filter.isSynced !== undefined) {
      where.isSynced = filter.isSynced;
    }

    if (filter.search) {
      where.AND = [
        {
          OR: [
            { title: { contains: filter.search, mode: "insensitive" } },
            { description: { contains: filter.search, mode: "insensitive" } },
            { name: { contains: filter.search, mode: "insensitive" } },
          ],
        },
      ];
    }

    return db.blockPattern.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        revisions: {
          orderBy: { version: "desc" },
          take: 5,
        },
      },
    });
  }

  /**
   * Get pattern by ID.
   */
  async getPatternById(id: string) {
    const db = prisma as any;
    return db.blockPattern.findUnique({
      where: { id },
      include: {
        revisions: {
          orderBy: { version: "desc" },
        },
      },
    });
  }

  /**
   * Update pattern and record version revision if synced.
   */
  async updatePattern(id: string, input: UpdatePatternInput, userId: string) {
    const db = prisma as any;
    const existing = await db.blockPattern.findUnique({ where: { id } });
    if (!existing) {
      throw new Error("Block pattern not found");
    }

    const data: any = {};
    if (input.title !== undefined) data.title = input.title;
    if (input.description !== undefined) data.description = input.description;
    if (input.category !== undefined) data.category = input.category;
    if (input.categories !== undefined) data.categories = input.categories;
    if (input.viewportWidth !== undefined) data.viewportWidth = input.viewportWidth;
    if (input.blockTypes !== undefined) data.blockTypes = input.blockTypes;
    if (input.keywords !== undefined) data.keywords = input.keywords;
    if (input.isSynced !== undefined) data.isSynced = input.isSynced;
    if (input.syncStatus !== undefined) data.syncStatus = input.syncStatus;

    if (Array.isArray(input.content)) {
      const normalizedBlocks: BlockNode[] = [];
      for (const block of input.content) {
        const validation = validateAndNormalizeBlock(block);
        if (!validation.valid) {
          throw new Error(`Invalid block in pattern update: ${validation.errors.join(", ")}`);
        }
        if (validation.sanitizedBlock) {
          normalizedBlocks.push(validation.sanitizedBlock);
        }
      }
      data.content = normalizedBlocks as any;
    }

    const nextVersion = existing.version + 1;
    data.version = nextVersion;

    const updated = await db.blockPattern.update({
      where: { id },
      data,
    });

    if (updated.isSynced && input.content) {
      await db.syncedPatternRevision.create({
        data: {
          patternId: updated.id,
          version: nextVersion,
          title: updated.title,
          content: updated.content as any,
          description: input.description || `Updated to version ${nextVersion}`,
          createdBy: userId,
        },
      });
    }

    return updated;
  }

  /**
   * Delete pattern.
   */
  async deletePattern(id: string) {
    const db = prisma as any;
    return db.blockPattern.delete({
      where: { id },
    });
  }

  /**
   * Detach a synced pattern block reference into independent local blocks.
   */
  async detachSyncedPattern(patternId: string): Promise<BlockNode[]> {
    const db = prisma as any;
    const pattern = await db.blockPattern.findUnique({ where: { id: patternId } });
    if (!pattern) {
      throw new Error("Synced pattern not found for detaching");
    }

    const blocks = (pattern.content as unknown as BlockNode[]) || [];
    // Deep clone and generate new unique IDs for detached blocks
    const detachBlocks = (list: BlockNode[]): BlockNode[] => {
      return list.map((b) => ({
        ...b,
        id: `block-${Math.random().toString(36).substring(2, 9)}`,
        innerBlocks: b.innerBlocks ? detachBlocks(b.innerBlocks) : [],
        metadata: {
          ...b.metadata,
          detachedFromPatternId: patternId,
          detachedAt: new Date().toISOString(),
        },
      }));
    };

    return detachBlocks(blocks);
  }
}

export const blockPatternService = new BlockPatternService();
