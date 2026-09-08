import type { EditorElement } from "../types";

/**
 * Clean helper function to format CSS styles object into inline CSS string or style props
 */
function formatStylesToCSS(styles: Record<string, any> = {}): string {
  if (!styles || Object.keys(styles).length === 0) return "";
  return Object.entries(styles)
    .map(([key, val]) => {
      const kebabKey = key.replace(/([A-Z])/g, "-$1").toLowerCase();
      return `${kebabKey}: ${val};`;
    })
    .join(" ");
}

function formatStylesToJSX(styles: Record<string, any> = {}): string {
  if (!styles || Object.keys(styles).length === 0) return "{}";
  return JSON.stringify(styles, null, 2);
}

/**
 * 1. Generate Vanilla JavaScript (.js)
 */
export function generateJSCode(el: EditorElement): string {
  const sanitizeName = (typeStr?: string) => (typeStr ? typeStr.replace(/[^a-zA-Z0-9]/g, "") : "Component");
  const compName = sanitizeName(el.type);

  return `// ${compName}.js - Vanilla JavaScript Component
export function render${compName}(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const element = document.createElement("${el.type === "container" ? "div" : el.type === "button" ? "button" : "div"}");
  ${el.customId ? `element.id = "${el.customId}";` : ""}
  ${el.classes && el.classes.length > 0 ? `element.className = "${el.classes.join(" ")}";` : ""}
  element.style.cssText = "${formatStylesToCSS(el.styles)}";

  ${el.content ? `element.textContent = ${JSON.stringify(el.content)};` : ""}
  ${el.src ? `element.setAttribute("src", ${JSON.stringify(el.src)});` : ""}
  ${el.href ? `element.setAttribute("href", ${JSON.stringify(el.href)});` : ""}

  ${
    el.children && el.children.length > 0
      ? `// Render Child Nodes
  const childHTML = \`
${el.children.map((c) => `    <div style="${formatStylesToCSS(c.styles)}">${c.content || ""}</div>`).join("\n")}
  \`;
  element.innerHTML += childHTML;`
      : ""
  }

  container.appendChild(element);
}
`;
}

/**
 * 2. Generate Type-Safe TypeScript (.ts)
 */
export function generateTSCode(el: EditorElement): string {
  const sanitizeName = (typeStr?: string) => (typeStr ? typeStr.replace(/[^a-zA-Z0-9]/g, "") : "Component");
  const compName = sanitizeName(el.type);

  return `// ${compName}.ts - Type-Safe Component Generator
export interface ${compName}Props {
  id?: string;
  className?: string;
  content?: string;
  src?: string;
  href?: string;
  styles?: Partial<CSSStyleDeclaration>;
}

export class ${compName}Component {
  private props: ${compName}Props;

  constructor(props: ${compName}Props = {}) {
    this.props = {
      id: ${JSON.stringify(el.customId || "")},
      className: ${JSON.stringify((el.classes || []).join(" "))},
      content: ${JSON.stringify(el.content || "")},
      src: ${JSON.stringify(el.src || "")},
      href: ${JSON.stringify(el.href || "")},
      ...props
    };
  }

  public render(target: HTMLElement): HTMLElement {
    const el = document.createElement("${el.type === "container" ? "div" : el.type === "button" ? "button" : "div"}");
    if (this.props.id) el.id = this.props.id;
    if (this.props.className) el.className = this.props.className;
    el.style.cssText = "${formatStylesToCSS(el.styles)}";

    if (this.props.content) el.textContent = this.props.content;
    if (this.props.src) el.setAttribute("src", this.props.src);
    if (this.props.href) el.setAttribute("href", this.props.href);

    target.appendChild(el);
    return el;
  }
}
`;
}

/**
 * 3. Generate Functional React (.jsx)
 */
export function generateJSXCode(el: EditorElement): string {
  const sanitizeName = (typeStr?: string) => (typeStr ? typeStr.replace(/[^a-zA-Z0-9]/g, "") : "Component");
  const compName = sanitizeName(el.type);

  const stylesObj = el.styles || {};
  const classNameStr = (el.classes || []).join(" ");
  const tag = el.type === "button" ? "button" : el.type === "heading" ? (el.headingLevel || "h2") : el.type === "image" ? "img" : "div";

  return `// ${compName}.jsx - React Component
import React from 'react';

export default function ${compName}(props) {
  const {
    id = ${JSON.stringify(el.customId || "")},
    className = ${JSON.stringify(classNameStr)},
    style = ${formatStylesToJSX(stylesObj)},
    children,
    ...rest
  } = props;

  return (
    <${tag}
      id={id || undefined}
      className={className || undefined}
      style={style}
      ${el.src ? `src=${JSON.stringify(el.src)}` : ""}
      ${el.href ? `href=${JSON.stringify(el.href)}` : ""}
      {...rest}
    >
      {children || ${JSON.stringify(el.content || "")}}
      ${
        el.children && el.children.length > 0
          ? `\n      ${el.children
              .map((c) => `<div style={${formatStylesToJSX(c.styles)}}>${c.content || ""}</div>`)
              .join("\n      ")}`
          : ""
      }
    </${tag}>
  );
}
`;
}

/**
 * 4. Generate Fully Typed React + TSX (.tsx)
 */
export function generateTSXCode(el: EditorElement): string {
  const sanitizeName = (typeStr?: string) => (typeStr ? typeStr.replace(/[^a-zA-Z0-9]/g, "") : "Component");
  const compName = sanitizeName(el.type);

  const stylesObj = el.styles || {};
  const classNameStr = (el.classes || []).join(" ");
  const tag = el.type === "button" ? "button" : el.type === "heading" ? (el.headingLevel || "h2") : el.type === "image" ? "img" : "div";

  return `// ${compName}.tsx - Typed React Component
import React, { FC, CSSProperties, HTMLAttributes } from 'react';

export interface ${compName}Props extends HTMLAttributes<HTMLElement> {
  id?: string;
  className?: string;
  style?: CSSProperties;
  content?: string;
  src?: string;
  href?: string;
}

export const ${compName}: FC<${compName}Props> = ({
  id = ${JSON.stringify(el.customId || "")},
  className = ${JSON.stringify(classNameStr)},
  style = ${formatStylesToJSX(stylesObj)},
  content = ${JSON.stringify(el.content || "")},
  src = ${JSON.stringify(el.src || "")},
  href = ${JSON.stringify(el.href || "")},
  children,
  ...rest
}) => {
  return (
    <${tag}
      id={id || undefined}
      className={className || undefined}
      style={style}
      ${el.src ? `src={src}` : ""}
      ${el.href ? `href={href}` : ""}
      {...rest}
    >
      {children || content}
      ${
        el.children && el.children.length > 0
          ? `\n      ${el.children
              .map((c) => `<div style={${formatStylesToJSX(c.styles)}}>${c.content || ""}</div>`)
              .join("\n      ")}`
          : ""
      }
    </${tag}>
  );
};

export default ${compName};
`;
}
