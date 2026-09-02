const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/editor/WebsiteEditor.tsx', 'utf8');

// 1. Add htmlAllowScripts to EditorElement interface
code = code.replace(
    'htmlContent?: string; // F-110: Custom HTML Widget content\n  shortcode?: string; // F-111: Shortcode Widget content',
    'htmlContent?: string; // F-110: Custom HTML Widget content\n  htmlAllowScripts?: boolean; // F-110\n  shortcode?: string; // F-111: Shortcode Widget content'
);

// 2. Add UI for htmlAllowScripts
const htmlUiReplacement = `
                      <div className="mt-2">
                        <label className="flex items-center gap-2 cursor-pointer bg-red-50/50 p-2 rounded border border-red-200" title="Bypasses sanitization in preview mode">
                          <input
                             type="checkbox"
                             checked={!!selectedElement.htmlAllowScripts}
                             onChange={(e) => updateSelectedProp("htmlAllowScripts", e.target.checked)}
                          />
                          <span className="text-[10px] font-bold text-red-700">Allow Unsafe Scripts & Iframes</span>
                        </label>
                      </div>

                      <div className="flex gap-2 justify-end mt-2">
`;
code = code.replace(
    '<div className="flex gap-2 justify-end">',
    htmlUiReplacement
);

// 3. Update HTML execution block
const htmlRenderOld = `dangerouslySetInnerHTML={{
              __html: sanitizeHtml(el.htmlContent || "") || (isPreview ? "" : \`<div class="py-6 text-center text-xs font-semibold text-slate-400 border border-dashed border-slate-350 bg-slate-50/50 rounded-lg select-none">✏️ Click or Double-click to Edit HTML content</div>\`)
            }}`;

const htmlRenderNew = `dangerouslySetInnerHTML={{
              __html: (isPreview && el.htmlAllowScripts)
                  ? (el.htmlContent || (isPreview ? "" : "<div class='py-6 text-center text-xs font-semibold text-slate-400 border border-dashed border-slate-350 bg-slate-50/50 rounded-lg select-none'>✏️ Empty HTML Widget</div>"))
                  : (sanitizeHtml(el.htmlContent || "") || (isPreview ? "" : \`<div class="py-6 text-center text-xs font-semibold text-slate-400 border border-dashed border-slate-350 bg-slate-50/50 rounded-lg select-none">✏️ Click or Double-click to Edit HTML content</div>\`))
            }}`;
code = code.replace(htmlRenderOld, htmlRenderNew);


// 4. Update shortcode evaluation block
const shortcodeOld = `const type = match[1];
                if (type === "contact-form" || type === "contact_form") {
                  return <div className="p-4 border rounded bg-slate-100 flex flex-col items-center justify-center min-h-[150px]"><span className="text-slate-500 font-semibold">[Contact Form Integration]</span></div>;
                }`;

const shortcodeNew = `const type = match[1];
                if (type === "contact-form" || type === "contact_form") {
                  return (
                    <form className="space-y-4 w-full max-w-lg p-6 bg-white rounded-xl shadow-sm border border-slate-200" onSubmit={(e) => { e.preventDefault(); alert('Shortcode form simulated submission'); }}>
                       <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2">Contact Us</h3>
                       <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">Name</label>
                          <input type="text" placeholder="John Doe" className="w-full text-sm px-3 py-2 border border-slate-300 rounded focus:border-blue-500 outline-none" required />
                       </div>
                       <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">Email</label>
                          <input type="email" placeholder="john@example.com" className="w-full text-sm px-3 py-2 border border-slate-300 rounded focus:border-blue-500 outline-none" required />
                       </div>
                       <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">Message</label>
                          <textarea placeholder="How can we help you?" className="w-full text-sm px-3 py-2 border border-slate-300 rounded h-24 focus:border-blue-500 outline-none" required></textarea>
                       </div>
                       <button type="submit" className="w-full py-2 bg-blue-600 cursor-pointer text-white text-sm font-bold rounded hover:bg-blue-700 transition">Send Message</button>
                    </form>
                  );
                }`;
code = code.replace(shortcodeOld, shortcodeNew);


// 5. Inject F-112 Custom Code script evaluator
const customCodeEffect = `
  // F-112 and F-113: Custom Code & Conditions Runtime Execution Wrapper
  useEffect(() => {
    if (!isPreview) return;

    const list = globalSettings?.customCodeList || [];
    if (list.length === 0) return;

    const injectedNodes: HTMLScriptElement[] = [];

    list.forEach((snip: any) => {
      // 1. Condition Evaluation (F-113)
      if (snip.conditions && snip.conditions.length > 0) {
        let conditionFailed = false;
        for (const cond of snip.conditions) {
          if (cond.type === 'device') {
            const mappedDevice = activeBreakpointId.toLowerCase();
            let isMatch = false;
            if (cond.value === 'mobile' && mappedDevice.includes('mobile')) isMatch = true;
            else if (cond.value === 'tablet' && mappedDevice.includes('tablet')) isMatch = true;
            else if (cond.value === 'desktop' && (mappedDevice.includes('desktop') || mappedDevice === 'widescreen' || mappedDevice === 'laptop')) isMatch = true;
            
            if (cond.operator === 'equals' && !isMatch) conditionFailed = true;
            if (cond.operator === 'not_equals' && isMatch) conditionFailed = true;
          }
        }
        if (conditionFailed) return; // Skip injection due to device condition
      }

      // 2. Draft Execution Injection (F-112)
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
    });

    return () => {
      // Clean up injected DOM scripts accurately to prevent memory leaks in dev
      injectedNodes.forEach(node => {
        if (node.parentNode) node.parentNode.removeChild(node);
      });
    };
  }, [isPreview, activeBreakpointId, globalSettings?.customCodeList]);

`;

code = code.replace('const handleToggleBreakpoint = (id: string) => {', customCodeEffect + '  const handleToggleBreakpoint = (id: string) => {');


fs.writeFileSync('frontend/src/pages/editor/WebsiteEditor.tsx', code);
console.log("Phase 2 updates finished");
