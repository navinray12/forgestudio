import type { BlockTypeDefinition } from "../types/block.types";

export const CORE_BLOCK_REGISTRY: Record<string, BlockTypeDefinition> = {
  "core/paragraph": {
    name: "core/paragraph",
    title: "Paragraph",
    category: "text",
    icon: "📝",
    description: "Start with the basic building block of all narrative.",
    attributes: {
      content: { type: "string", default: "", sanitized: true },
      align: { type: "string", default: "left", enum: ["left", "center", "right", "justify"] },
      dropCap: { type: "boolean", default: false },
      placeholder: { type: "string", default: "" },
    },
    supports: {
      align: true,
      color: true,
      typography: true,
      spacing: true,
      customClassName: true,
      anchor: true,
    },
    variations: [
      {
        name: "lead-paragraph",
        title: "Lead Paragraph",
        description: "Larger introductory paragraph text",
        icon: "📜",
        attributes: {
          style: { typography: { fontSize: "1.25rem", lineHeight: "1.6" } },
        },
      },
    ],
    transforms: [
      {
        targetType: "core/heading",
        title: "Heading",
        transform: (b) => ({
          ...b,
          name: "core/heading",
          attributes: { content: b.attributes.content || "", level: 2 },
        }),
      },
      {
        targetType: "core/list",
        title: "List",
        transform: (b) => ({
          ...b,
          name: "core/list",
          attributes: { values: (b.attributes.content || "").split("\n").filter(Boolean) },
        }),
      },
    ],
  },

  "core/heading": {
    name: "core/heading",
    title: "Heading",
    category: "text",
    icon: "🔤",
    description: "Introduce new sections and organize your content.",
    attributes: {
      content: { type: "string", default: "", sanitized: true },
      level: { type: "number", default: 2, enum: [1, 2, 3, 4, 5, 6] },
      textAlign: { type: "string", default: "left", enum: ["left", "center", "right"] },
    },
    supports: {
      align: true,
      color: true,
      typography: true,
      customClassName: true,
      anchor: true,
    },
    variations: [
      {
        name: "subheading",
        title: "Subheading (H3)",
        icon: "🏷️",
        attributes: { level: 3 },
      },
    ],
    transforms: [
      {
        targetType: "core/paragraph",
        title: "Paragraph",
        transform: (b) => ({
          ...b,
          name: "core/paragraph",
          attributes: { content: b.attributes.content || "" },
        }),
      },
    ],
  },

  "core/image": {
    name: "core/image",
    title: "Image",
    category: "media",
    icon: "🖼️",
    description: "Insert an image to make a visual statement.",
    attributes: {
      url: { type: "string", default: "", sanitized: true },
      alt: { type: "string", default: "", sanitized: true },
      caption: { type: "string", default: "", sanitized: true },
      align: { type: "string", default: "none", enum: ["none", "left", "center", "right", "wide", "full"] },
      width: { type: "number" },
      height: { type: "number" },
      aspectRatio: { type: "string", default: "auto" },
    },
    supports: {
      align: true,
      customClassName: true,
      anchor: true,
    },
    transforms: [
      {
        targetType: "core/media",
        title: "Media",
        transform: (b) => ({
          ...b,
          name: "core/media",
          attributes: { url: b.attributes.url || "", alt: b.attributes.alt || "", mediaType: "image" },
        }),
      },
    ],
  },

  "core/button": {
    name: "core/button",
    title: "Button",
    category: "design",
    icon: "🔘",
    description: "Prompt visitors to take action with a button link.",
    attributes: {
      text: { type: "string", default: "Click Me", sanitized: true },
      url: { type: "string", default: "#", sanitized: true },
      linkTarget: { type: "string", default: "_self", enum: ["_self", "_blank"] },
      variant: { type: "string", default: "fill", enum: ["fill", "outline", "ghost", "gradient"] },
    },
    supports: {
      color: true,
      typography: true,
      spacing: true,
      customClassName: true,
    },
    variations: [
      {
        name: "outline-button",
        title: "Outline Button",
        icon: "⭕",
        attributes: { variant: "outline" },
      },
      {
        name: "cta-button",
        title: "Gradient CTA Button",
        icon: "✨",
        attributes: { variant: "gradient" },
      },
    ],
    transforms: [
      {
        targetType: "core/link",
        title: "Link",
        transform: (b) => ({
          ...b,
          name: "core/link",
          attributes: { text: b.attributes.text || "Link", url: b.attributes.url || "#" },
        }),
      },
    ],
  },

  "core/group": {
    name: "core/group",
    title: "Group / Container",
    category: "design",
    icon: "📦",
    description: "Gather blocks into a layout container.",
    attributes: {
      tagName: { type: "string", default: "div", enum: ["div", "header", "main", "section", "article", "aside", "footer"] },
      layout: { type: "object", default: { type: "flex", orientation: "vertical" } },
    },
    supports: {
      align: true,
      color: true,
      spacing: true,
      customClassName: true,
    },
    variations: [
      {
        name: "group-row",
        title: "Row Container",
        icon: "↔️",
        attributes: { layout: { type: "flex", orientation: "horizontal" } },
      },
      {
        name: "group-stack",
        title: "Stack Container",
        icon: "↕️",
        attributes: { layout: { type: "flex", orientation: "vertical" } },
      },
    ],
  },

  "core/quote": {
    name: "core/quote",
    title: "Quote",
    category: "text",
    icon: "💬",
    description: "Give special emphasis to a quote or citation.",
    attributes: {
      citation: { type: "string", default: "", sanitized: true },
      value: { type: "string", default: "", sanitized: true },
      align: { type: "string", default: "left" },
    },
    supports: {
      color: true,
      typography: true,
      customClassName: true,
    },
  },

  "core/code": {
    name: "core/code",
    title: "Code",
    category: "text",
    icon: "💻",
    description: "Display code snippets that respect your spacing and tabs.",
    attributes: {
      content: { type: "string", default: "", sanitized: true },
      language: { type: "string", default: "javascript" },
    },
    supports: {
      typography: true,
      customClassName: true,
    },
  },
};

export function getRegisteredBlockType(name: string): BlockTypeDefinition | undefined {
  return CORE_BLOCK_REGISTRY[name] || CORE_BLOCK_REGISTRY[`core/${name}`];
}
