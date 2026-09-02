const fs = require('fs');

let con = fs.readFileSync('frontend/src/pages/editor/WebsiteEditor.tsx', 'utf8');

const oldEffect = `// 2. Draft Execution Injection (F-112)
      if (snip.type === 'javascript' && snip.code) {
        try {
          const scriptEl = document.createElement('script');
          scriptEl.id = \`fs-custom-snip-\${snip.id}\`;
          scriptEl.textContent = \`
            try {
              \${snip.code}
            } catch (err) {
              console.error("ForgeStudio Sandbox Error in snippet:", "\${snip.name}", err);
            }
          \`;
          
          if (snip.placement === 'header' || snip.placement === 'head') {
            document.head.appendChild(scriptEl);
          } else {
            document.body.appendChild(scriptEl);
          }
          
          injectedNodes.push(scriptEl);
        } catch (e) {
          console.error("Injection error", e);
        }
      }`;

const newEffect = `// 2. Draft Execution Injection (F-112) & Dependencies (F-120)
      const executeSnippet = async () => {
        // Load Dependencies (F-120)
        if (snip.dependencies && snip.dependencies.length > 0) {
          for (const dep of snip.dependencies) {
            await new Promise<void>((resolve) => {
              if (dep.type === 'javascript' && dep.url) {
                const depEl = document.createElement('script');
                depEl.src = dep.url;
                depEl.onload = () => resolve();
                depEl.onerror = () => resolve();
                document.head.appendChild(depEl);
                injectedNodes.push(depEl as any);
              } else if (dep.type === 'css' && dep.url) {
                const depEl = document.createElement('link');
                depEl.rel = "stylesheet";
                depEl.href = dep.url;
                depEl.onload = () => resolve();
                depEl.onerror = () => resolve();
                document.head.appendChild(depEl);
                injectedNodes.push(depEl as any);
              } else {
                resolve();
              }
            });
          }
        }

        // Execute Snippet
        if (snip.type === 'javascript' && snip.code) {
          try {
            const scriptEl = document.createElement('script');
            scriptEl.id = \`fs-custom-snip-\${snip.id}\`;
            scriptEl.textContent = \`
              try {
                \${snip.code}
              } catch (err) {
                console.error("ForgeStudio Sandbox Error in snippet:", "\${snip.name}", err);
              }
            \`;
            
            if (snip.placement === 'header' || snip.placement === 'head') {
              document.head.appendChild(scriptEl);
            } else {
              document.body.appendChild(scriptEl);
            }
            
            injectedNodes.push(scriptEl);
          } catch (e) {
            console.error("Injection error", e);
          }
        }
      };

      executeSnippet();`;

con = con.replace(oldEffect, newEffect);

fs.writeFileSync('frontend/src/pages/editor/WebsiteEditor.tsx', con);
console.log('F-120 Dep injection applied.');
