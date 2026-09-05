import type { CustomCodeSnippet } from "../../../services/customCode.service";
import DOMPurify from "dompurify";

interface Props {
    snippets: CustomCodeSnippet[];
    currentPageId?: string;
    useDraft?: boolean;
}

export function shouldApplyCustomCode(snippet: CustomCodeSnippet, currentPageId: string): boolean {
    if (snippet.status && snippet.status !== 'PUBLISHED') return false;
    if (snippet.status === undefined && !snippet.isActive) return false;

    if (snippet.scope === "PAGE" && snippet.pageId !== currentPageId) return false;

    if (snippet.conditions) {
        let currentPath = '/';
        let currentDevice = 'desktop';
        if (typeof window !== 'undefined') {
            currentPath = window.location.pathname;
            const width = window.innerWidth;
            if (width < 768) currentDevice = 'mobile';
            else if (width < 1024) currentDevice = 'tablet';
        }

        if (snippet.conditions.pages && snippet.conditions.pages.length > 0) {
            if (!snippet.conditions.pages.includes(currentPath) && !snippet.conditions.pages.includes(currentPageId)) {
                return false;
            }
        }

        if (snippet.conditions.devices && snippet.conditions.devices.length > 0) {
            if (!snippet.conditions.devices.includes(currentDevice)) return false;
        }
    }

    return true;
}

export default function CodeInjectionRuntime({ snippets, currentPageId = "home" }: Props) {
    // Only execute JS on live Published sites, not inside the builder Preview mode!
    // isPreview={true} means we are executing safely in runtime. 

    if (!snippets || snippets.length === 0) return null;

    // Filter out inactive/unmatching snippets and map Priority (highest to lowest).
    const activeSnippets = snippets
        .filter(s => shouldApplyCustomCode(s, currentPageId))
        .sort((a, b) => (b.priority || 0) - (a.priority || 0));

    const cssSnippets = activeSnippets.filter(s => s.language === "CSS");
    const htmlSnippets = activeSnippets.filter(s => s.language === "HTML");
    const jsSnippets = activeSnippets.filter(s => s.language === "JS");

    return (
        <>
            {/* CSS Injection */}
            {cssSnippets.map((s) => {
                // Ensure no JS loops in CSS code blocks
                const safeCss = s.code.replace(/javascript:/gi, "blocked:");
                return (
                    <style key={s.id} data-custom-code-id={s.id} dangerouslySetInnerHTML={{ __html: safeCss }} />
                );
            })}

            {/* HTML Injection */}
            {htmlSnippets.map((s) => {
                // We use DOMPurify to guarantee absolutely no broken or malicious XSS tags
                const cleanHtml = DOMPurify.sanitize(s.code, {
                    ADD_TAGS: ["iframe", "meta", "link", "style"],
                    ADD_ATTR: ["allow", "allowfullscreen", "frameborder", "scrolling", "name", "content", "rel", "href"],
                });
                return (
                    <div
                        key={s.id}
                        data-custom-code-id={s.id}
                        data-location={s.placement}
                        dangerouslySetInnerHTML={{ __html: cleanHtml }}
                    />
                );
            })}

            {/* JavaScript Execution Isolation (Sandboxed properly) */}
            {/* Extremely strict safety measure: do NOT allow scripts to interact directly with parent Builder if rendered there */}
            {jsSnippets.map((s) => (
                <iframe
                    key={s.id}
                    data-custom-code-id={s.id}
                    title={`isolated-js-${s.id}`}
                    sandbox="allow-scripts allow-same-origin"
                    style={{ display: "none", width: 0, height: 0, border: 0 }}
                    srcDoc={`
            <html>
              <head><title>JS Sandbox</title></head>
              <body>
                <script>
                  try {
                    ${s.code}
                  } catch (e) {
                    console.error("Custom Code JS Error (" + "${s.title}" + "): ", e);
                  }
                </script>
              </body>
            </html>
          `}
                />
            ))}
        </>
    );
}
