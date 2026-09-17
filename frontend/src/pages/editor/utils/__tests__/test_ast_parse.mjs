import ts from "typescript";

const code = `
import React from 'react';

export default function HeroSection() {
  return (
    <section style={{ backgroundColor: "#0f172a", padding: "48px 24px" }} className="hero-container">
      <h1 style={{ color: "#ffffff", fontSize: "42px" }}>Build High-Performance Applications</h1>
      <p style={{ color: "#94a3b8" }}>Accelerate your development cycle with ForgeStudio.</p>
      <img src="https://images.unsplash.com/photo-banner" alt="Dashboard" />
      <div style={{ display: "flex", gap: "16px" }}>
        <a href="https://forgestudio.io/signup" style={{ backgroundColor: "#3b82f6" }}>Start Building Free</a>
        <a href="https://forgestudio.io/docs">Documentation</a>
      </div>
    </section>
  );
}
`;

const sf = ts.createSourceFile("test.tsx", code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
console.log("SourceFile created successfully.");
console.log("Number of statements:", sf.statements.length);

function findJsx(node) {
  if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
    return node;
  }
  let result = null;
  ts.forEachChild(node, (child) => {
    if (!result) {
      result = findJsx(child);
    }
  });
  return result;
}

const rootJsx = findJsx(sf);
if (rootJsx) {
  if (ts.isJsxElement(rootJsx)) {
    console.log("Root JSX tag:", rootJsx.openingElement.tagName.getText(sf));
    console.log("Number of children:", rootJsx.children.length);
  } else {
    console.log("Root self-closing JSX tag:", rootJsx.tagName.getText(sf));
  }
} else {
  console.log("No JSX element found.");
}
