export interface CustomCodeSnippetData { name: string; priority: number; location: 'head' | 'body-start' | 'body-end'; codeType: 'css' | 'html' | 'javascript'; conditions?: any; scope?: string; enabled?: boolean; } export interface CustomCodeSnippet { id: string; status: string; draft?: CustomCodeSnippetData; published?: CustomCodeSnippetData; }

export interface OrderedSnippetData {
    id: string;
    name: string;
    data: CustomCodeSnippetData;
}

export function getApplicableCustomCode(
    snippets: CustomCodeSnippet[],
    currentPageId: string,
    useDraft: boolean
): OrderedSnippetData[] {
    const activeDataList: OrderedSnippetData[] = [];

    snippets.forEach((s) => {
        let data: CustomCodeSnippetData | null | undefined;

        // F-114/F-115 Logic: Draft vs Published
        if (useDraft) {
            data = s.draft || s.published;
        } else {
            if (s.status === "published" || s.status === "modified" || s.status === "scheduled") {
                data = s.published;
            }
        }

        if (!data) return;
        if (!data.enabled) return;

        // Normalize priority to 10 if missing
        if (typeof data.priority !== "number" || isNaN(data.priority)) {
            data.priority = 10;
        }

        // F-113 Conditions check
        let applies = true;
        const conditions = data.conditions;
        if (!conditions) {
            if (data.scope === "page") {
                applies = currentPageId === "home";
            }
        } else {
            let isExcluded = false;
            if (conditions.excludes && conditions.excludes.length > 0) {
                isExcluded = conditions.excludes.some((rule: any) => {
                    if (rule.type === "page") {
                        return rule.operator === "is" ? currentPageId === rule.value : currentPageId !== rule.value;
                    }
                    return false;
                });
            }

            if (isExcluded) applies = false;
            else if (conditions.applyTo === "specific") {
                if (!conditions.includes || conditions.includes.length === 0) applies = false;
                else {
                    applies = conditions.includes.some((rule: any) => {
                        if (rule.type === "page") {
                            return rule.operator === "is" ? currentPageId === rule.value : currentPageId !== rule.value;
                        }
                        return false;
                    });
                }
            }
        }

        if (applies) {
            activeDataList.push({ id: s.id, name: data.name, data });
        }
    });

    return activeDataList;
}

export function getOrderedCustomCode(
    snippets: CustomCodeSnippet[],
    currentPageId: string,
    useDraft: boolean
): {
    cssSnippets: OrderedSnippetData[];
    htmlSnippets: OrderedSnippetData[];
    jsSnippets: OrderedSnippetData[];
} {
    const applicable = getApplicableCustomCode(snippets, currentPageId, useDraft);

    // Group by location (not type, but we return separated by type for final dom injection grouping)
    // Actually, wait! HTML injections need to be sorted by location AND priority.
    // CSS and JS usually just go to Head or Body, but the DOM injector groups them by type. 
    // Let's sort them all together conceptually!
    // F-116: Priority sorting: lower number runs earlier. Tie breaker is original Creation date via ID or strictly string comparison.

    applicable.sort((a, b) => {
        // 1. Location (Although DOM rendering already splits by Head/Body conceptually for HTML, let's strictly order them here)
        const locOpts: any = { "head": 1, "body-start": 2, "body-end": 3 };
        const locDiff = locOpts[a.data.location] - locOpts[b.data.location];
        if (locDiff !== 0) return locDiff;

        // 2. Priority
        const p1 = typeof a.data.priority === "number" && !isNaN(a.data.priority) ? a.data.priority : 10;
        const p2 = typeof b.data.priority === "number" && !isNaN(b.data.priority) ? b.data.priority : 10;

        if (p1 !== p2) return p1 - p2;

        // 3. Stable tie-breaker (ID string comparison acting as chronological stand-in for generateId timestamp)
        return a.id.localeCompare(b.id);
    });

    return {
        cssSnippets: applicable.filter(s => s.data.codeType === "css"),
        htmlSnippets: applicable.filter(s => s.data.codeType === "html"),
        jsSnippets: applicable.filter(s => s.data.codeType === "javascript"),
    };
}

