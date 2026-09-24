import type {
  BlockNode,
  DocumentOutlineItem,
  DocumentStats,
  HeadingValidationIssue,
} from "../types/block.types";

export class DocumentOutlineService {
  /**
   * Generates a flat/hierarchical list of outline items from the block tree.
   */
  static generateDocumentOutline(blocks: BlockNode[], depth = 0): DocumentOutlineItem[] {
    const outline: DocumentOutlineItem[] = [];

    for (const block of blocks) {
      const isHeading = block.name === "core/heading";
      const headingLevel = isHeading ? Number(block.attributes?.level || 2) : undefined;
      const textContent =
        block.attributes?.content ||
        block.attributes?.text ||
        block.attributes?.alt ||
        block.name;

      if (isHeading || block.name === "core/cover" || block.name === "core/group") {
        outline.push({
          id: `outline-${block.id}`,
          blockId: block.id,
          blockName: block.name,
          headingLevel,
          text: String(textContent).replace(/<[^>]*>/g, ""),
          depth,
          hasChildren: Array.isArray(block.innerBlocks) && block.innerBlocks.length > 0,
        });
      }

      if (Array.isArray(block.innerBlocks) && block.innerBlocks.length > 0) {
        const childOutline = this.generateDocumentOutline(block.innerBlocks, depth + 1);
        outline.push(...childOutline);
      }
    }

    return outline;
  }

  /**
   * Calculates overall document statistics: words, characters, block counts.
   */
  static calculateDocumentStats(blocks: BlockNode[]): DocumentStats {
    let stats: DocumentStats = {
      words: 0,
      characters: 0,
      blocks: 0,
      headings: 0,
      paragraphs: 0,
      images: 0,
    };

    const processBlock = (block: BlockNode) => {
      stats.blocks++;

      if (block.name === "core/heading") stats.headings++;
      if (block.name === "core/paragraph") stats.paragraphs++;
      if (block.name === "core/image") stats.images++;

      const content = String(block.attributes?.content || block.attributes?.text || "").replace(/<[^>]*>/g, "");
      if (content.trim()) {
        stats.characters += content.length;
        const words = content.trim().split(/\s+/).filter(Boolean);
        stats.words += words.length;
      }

      if (Array.isArray(block.innerBlocks)) {
        block.innerBlocks.forEach(processBlock);
      }
    };

    blocks.forEach(processBlock);
    return stats;
  }

  /**
   * Validates document heading hierarchy and WCAG accessibility standards.
   */
  static validateHeadingHierarchy(blocks: BlockNode[]): HeadingValidationIssue[] {
    const issues: HeadingValidationIssue[] = [];
    const headings: { blockId: string; level: number; text: string }[] = [];
    const images: { blockId: string; alt?: string }[] = [];

    const collectHeadings = (nodes: BlockNode[]) => {
      for (const node of nodes) {
        if (node.name === "core/heading") {
          headings.push({
            blockId: node.id,
            level: Number(node.attributes?.level || 2),
            text: String(node.attributes?.content || "").replace(/<[^>]*>/g, ""),
          });
        }
        if (node.name === "core/image") {
          images.push({
            blockId: node.id,
            alt: node.attributes?.alt,
          });
        }
        if (Array.isArray(node.innerBlocks)) {
          collectHeadings(node.innerBlocks);
        }
      }
    };

    collectHeadings(blocks);

    if (headings.length > 0) {
      const h1s = headings.filter((h) => h.level === 1);
      if (h1s.length === 0) {
        issues.push({
          type: "missing-h1",
          severity: "warning",
          message: "Document is missing a Main Title (H1) heading.",
        });
      } else if (h1s.length > 1) {
        issues.push({
          type: "multiple-h1",
          severity: "warning",
          message: `Multiple H1 headings detected (${h1s.length}). Best practice recommends a single H1 per page.`,
          blockId: h1s[1].blockId,
        });
      }

      // Check skipped heading levels (e.g. H1 directly followed by H3)
      for (let i = 0; i < headings.length - 1; i++) {
        const current = headings[i];
        const next = headings[i + 1];

        if (next.level > current.level + 1) {
          issues.push({
            type: "skipped-level",
            severity: "error",
            message: `Skipped heading level: H${current.level} to H${next.level} ("${next.text || 'Untitled'}").`,
            blockId: next.blockId,
          });
        }
      }
    }

    // Check image accessibility
    for (const img of images) {
      if (!img.alt || !img.alt.trim()) {
        issues.push({
          type: "missing-alt",
          severity: "warning",
          message: "Image block is missing accessible Alt text.",
          blockId: img.blockId,
        });
      }
    }

    return issues;
  }
}
