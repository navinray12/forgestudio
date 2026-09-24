import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import {
  validateAndNormalizeBlock,
  sanitizeHtmlContent,
  transformBlock,
  resolveBlockBindings,
  resolveBlockContext,
  serializeBlockToGutenberg,
  BlockNode,
} from "../services/blocks/blockEngine.service.js";

describe("WordPress Block Engine & Core Blocks Subsystem (F-509 - F-516)", () => {
  it("F-509 & F-516: Should validate attributes and sanitize XSS HTML content", () => {
    const maliciousBlock: BlockNode = {
      id: "block-xss-1",
      name: "core/paragraph",
      attributes: {
        content: '<script>alert("xss")</script><p onclick="bad()">Hello Safe Text</p><a href="javascript:alert(1)">Click</a>',
        align: "center",
      },
    };

    const res = validateAndNormalizeBlock(maliciousBlock);
    assert.strictEqual(res.valid, true);
    assert.ok(res.sanitizedBlock);
    assert.strictEqual(res.sanitizedBlock.attributes.content.includes("<script>"), false);
    assert.strictEqual(res.sanitizedBlock.attributes.content.includes("onclick="), false);
    assert.strictEqual(res.sanitizedBlock.attributes.content.includes("javascript:"), false);
    assert.ok(res.sanitizedBlock.attributes.content.includes("Hello Safe Text"));
  });

  it("F-509: Should reject circular block references and excessive nesting depth", () => {
    const circularChild: BlockNode = {
      id: "block-parent",
      name: "core/paragraph",
      attributes: {},
    };

    const parentBlock: BlockNode = {
      id: "block-parent",
      name: "core/group",
      attributes: {},
      innerBlocks: [circularChild],
    };

    const res = validateAndNormalizeBlock(parentBlock);
    assert.strictEqual(res.valid, false);
    assert.ok(res.errors.some((e) => e.includes("Circular reference or duplicate block ID")));
  });

  it("F-512: Should execute safe block type transformations", () => {
    const paragraphBlock: BlockNode = {
      id: "block-p1",
      name: "core/paragraph",
      attributes: { content: "Sample Heading Text", align: "center" },
    };

    // Paragraph -> Heading
    const transformHeadingRes = transformBlock(paragraphBlock, "core/heading");
    assert.strictEqual(transformHeadingRes.success, true);
    assert.ok(transformHeadingRes.transformedBlock);
    assert.strictEqual(transformHeadingRes.transformedBlock.name, "core/heading");
    assert.strictEqual(transformHeadingRes.transformedBlock.attributes.level, 2);

    // Heading -> Paragraph
    const headingBlock: BlockNode = transformHeadingRes.transformedBlock;
    const transformParaRes = transformBlock(headingBlock, "core/paragraph");
    assert.strictEqual(transformParaRes.success, true);
    assert.ok(transformParaRes.transformedBlock);
    assert.strictEqual(transformParaRes.transformedBlock.name, "core/paragraph");

    // Paragraph -> List
    const listBlock: BlockNode = {
      id: "block-p2",
      name: "core/paragraph",
      attributes: { content: "Item 1\nItem 2\nItem 3" },
    };
    const transformListRes = transformBlock(listBlock, "core/list");
    assert.strictEqual(transformListRes.success, true);
    assert.strictEqual(transformListRes.transformedBlock?.attributes.values.length, 3);
  });

  it("F-513: Should support block variations with default attributes", () => {
    const buttonBlock: BlockNode = {
      id: "btn-1",
      name: "core/button",
      variation: "cta-button",
      attributes: {
        text: "Join Now",
        variant: "gradient",
      },
    };

    const res = validateAndNormalizeBlock(buttonBlock);
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.sanitizedBlock?.variation, "cta-button");
    assert.strictEqual(res.sanitizedBlock?.attributes.variant, "gradient");
  });

  it("F-514: Should propagate parent-to-child block context", () => {
    const parentContainer: BlockNode = {
      id: "group-1",
      name: "core/group",
      attributes: {},
      context: { postId: "post-101", postType: "page", theme: "dark" },
      innerBlocks: [
        {
          id: "child-p",
          name: "core/paragraph",
          attributes: { content: "Nested Paragraph" },
        },
      ],
    };

    const resolvedTree = resolveBlockContext(parentContainer);
    assert.ok(resolvedTree.innerBlocks);
    assert.strictEqual(resolvedTree.innerBlocks[0].context?.postId, "post-101");
    assert.strictEqual(resolvedTree.innerBlocks[0].context?.theme, "dark");
  });

  it("F-515: Should resolve dynamic data bindings across providers", () => {
    const boundBlock: BlockNode = {
      id: "block-bound-1",
      name: "core/heading",
      attributes: { content: "Default Static Title" },
      bindings: {
        content: { provider: "post", field: "title" },
      },
    };

    const providerContext = {
      post: { id: "p1", title: "Dynamic Post Title from WordPress", date: "2026-09-24" },
      site: { name: "ForgeStudio Site" },
    };

    const resolved = resolveBlockBindings(boundBlock, providerContext);
    assert.strictEqual(resolved.attributes.content, "Dynamic Post Title from WordPress");
  });

  it("F-509 & F-500: Should serialize BlockNode to WordPress Gutenberg comment markup", () => {
    const sampleBlock: BlockNode = {
      id: "block-gutenberg-1",
      name: "core/paragraph",
      attributes: {
        content: "Hello Gutenberg World",
        align: "center",
      },
      className: "has-custom-class",
    };

    const markup = serializeBlockToGutenberg(sampleBlock);
    assert.ok(markup.includes("<!-- wp:paragraph"));
    assert.ok(markup.includes('"align":"center"'));
    assert.ok(markup.includes('"className":"has-custom-class"'));
    assert.ok(markup.includes("<p>Hello Gutenberg World</p>"));
    assert.ok(markup.includes("<!-- /wp:paragraph -->"));
  });
});
