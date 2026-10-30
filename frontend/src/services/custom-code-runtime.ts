import type {CustomCodeSnippet} from "./customCode.service";
export function shouldApplyCustomCode(snippet: CustomCodeSnippet, currentPageId: string): boolean {
    if (snippet.isActive === false) return false;
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

