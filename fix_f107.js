const fs = require('fs');

let con = fs.readFileSync('frontend/src/pages/editor/WebsiteEditor.tsx', 'utf8');

const oldLogic = `        const cleanSelector = selectorPart.trim();
        if (cleanSelector) {
          const scopedSelector = cleanSelector
            .split(",")
            .map((part) => {
              const trimmedPart = part.trim();
              if (!trimmedPart) return "";

              if (trimmedPart.includes("selector") || trimmedPart.includes("self") || trimmedPart.includes("&")) {
                return trimmedPart.replace(/selector|self|&/g, \`#\${targetSelectorId}\`);
              }

              if (trimmedPart.startsWith(":") || trimmedPart.startsWith("[")) {
                return \`#\${targetSelectorId}\${trimmedPart}\`;
              }

              return \`#\${targetSelectorId} \${trimmedPart}\`;
            })
            .join(", ");

          compiled += \`\${scopedSelector} {\\n  \${blockContent}\\n}\\n\`;
        }`;

const newLogic = `        const cleanSelector = selectorPart.trim();
        if (cleanSelector) {
          if (cleanSelector.startsWith("@media") || cleanSelector.startsWith("@supports") || cleanSelector.startsWith("@container") || cleanSelector.startsWith("@keyframes")) {
             // Recursive handling for nested blocks (F-107 Media Query support)
             if (cleanSelector.startsWith("@keyframes")) {
                compiled += \`\${cleanSelector} {\\n  \${blockContent}\\n}\\n\`;
             } else {
                const innerCompiled = compileScopedCss(blockContent, id, customId);
                compiled += \`\${cleanSelector} {\\n\${innerCompiled.split("\\n").map((l: string) => "  " + l).join("\\n")}\\n}\\n\`;
             }
          } else {
            const scopedSelector = cleanSelector
              .split(",")
              .map((part) => {
                const trimmedPart = part.trim();
                if (!trimmedPart) return "";

                if (trimmedPart.includes("selector") || trimmedPart.includes("self") || trimmedPart.includes("&")) {
                  return trimmedPart.replace(/selector|self|&/g, \`#\${targetSelectorId}\`);
                }

                if (trimmedPart.startsWith(":") || trimmedPart.startsWith("[")) {
                  return \`#\${targetSelectorId}\${trimmedPart}\`;
                }

                return \`#\${targetSelectorId} \${trimmedPart}\`;
              })
              .join(", ");

            compiled += \`\${scopedSelector} {\\n  \${blockContent}\\n}\\n\`;
          }
        }`;

con = con.replace(oldLogic, newLogic);
fs.writeFileSync('frontend/src/pages/editor/WebsiteEditor.tsx', con);
console.log("Fixed F-107 Media Query support");
