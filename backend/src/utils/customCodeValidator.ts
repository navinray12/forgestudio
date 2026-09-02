import vm from "node:vm";

export interface ValidationError {
    type: string;
    message: string;
    line?: number;
    column?: number;
}

export function validateJS(code: string): { isValid: boolean; error?: ValidationError } {
    try {
        // vm.Script compiles the code without executing it
        new vm.Script(code);
        return { isValid: true };
    } catch (err: any) {
        const match = err.stack?.match(/evalmachine\.<anonymous>:(\d+)(?::(\d+))?/);
        const line = match ? parseInt(match[1]) : 1;
        let column = undefined;
        if (err.stack) {
            const lines = err.stack.split("\n");
            const arrowIdx = lines.findIndex((l: string) => l.includes("^"));
            if (arrowIdx > 0) {
                const arrowLine = lines[arrowIdx];
                column = arrowLine.indexOf("^") + 1;
            }
        }
        return {
            isValid: false,
            error: {
                type: "javascript",
                message: err.message,
                line,
                column,
            },
        };
    }
}

export function validateCSS(code: string): { isValid: boolean; error?: ValidationError } {
    if (!code) return { isValid: true };
    let line = 1;
    let column = 1;
    const stack: { type: string; line: number; column: number }[] = [];
    let inString: string | null = null;
    let inComment = false;

    for (let i = 0; i < code.length; i++) {
        const char = code[i];
        const nextChar = code[i + 1] || "";

        const curLine = line;
        const curCol = column;

        if (char === "\n") {
            line++;
            column = 1;
        } else {
            column++;
        }

        if (inComment) {
            if (char === "*" && nextChar === "/") {
                inComment = false;
                i++; // skip '/'
                column++;
            }
            continue;
        }

        if (inString) {
            if (char === inString && code[i - 1] !== "\\") {
                inString = null;
            }
            continue;
        }

        if (char === "/" && nextChar === "*") {
            inComment = true;
            i++; // skip '*'
            column++;
            continue;
        }

        if (char === '"' || char === "'") {
            inString = char;
            continue;
        }

        if (char === "{") {
            stack.push({ type: "{", line: curLine, column: curCol });
        } else if (char === "}") {
            const top = stack.pop();
            if (!top || top.type !== "{") {
                return {
                    isValid: false,
                    error: {
                        type: "css",
                        message: "Unexpected closing brace '}'",
                        line: curLine,
                        column: curCol,
                    },
                };
            }
        } else if (char === "(") {
            stack.push({ type: "(", line: curLine, column: curCol });
        } else if (char === ")") {
            const top = stack.pop();
            if (!top || top.type !== "(") {
                return {
                    isValid: false,
                    error: {
                        type: "css",
                        message: "Unexpected closing parenthesis ')'",
                        line: curLine,
                        column: curCol,
                    },
                };
            }
        }
    }

    if (inComment) {
        return {
            isValid: false,
            error: {
                type: "css",
                message: "Unclosed comment '/*'",
                line,
                column,
            },
        };
    }

    if (inString) {
        return {
            isValid: false,
            error: {
                type: "css",
                message: "Unclosed string literal",
                line,
                column,
            },
        };
    }

    if (stack.length > 0) {
        const top = stack[stack.length - 1];
        return {
            isValid: false,
            error: {
                type: "css",
                message: `Unclosed brace '${top.type}'`,
                line: top.line,
                column: top.column,
            },
        };
    }

    return { isValid: true };
}

export function validateHTML(code: string): { isValid: boolean; error?: ValidationError } {
    if (!code) return { isValid: true };

    const selfClosing = new Set([
        "area", "base", "br", "col", "embed", "hr", "img", "input",
        "link", "meta", "param", "source", "track", "wbr"
    ]);

    let line = 1;
    let column = 1;
    const stack: { tag: string; line: number; column: number }[] = [];

    for (let i = 0; i < code.length; i++) {
        const char = code[i];

        const curLine = line;
        const curCol = column;

        if (char === "\n") {
            line++;
            column = 1;
        } else {
            column++;
        }

        if (char === "<") {
            if (code.slice(i, i + 4) === "<!--") {
                const endIdx = code.indexOf("-->", i);
                if (endIdx === -1) {
                    return {
                        isValid: false,
                        error: { type: "html", message: "Unclosed comment '<!--'", line: curLine, column: curCol }
                    };
                }
                const commentContent = code.substring(i + 4, endIdx);
                const commentLines = commentContent.split("\n");
                line += commentLines.length - 1;
                if (commentLines.length > 1) {
                    column = commentLines[commentLines.length - 1].length + 4;
                } else {
                    column += commentContent.length + 7;
                }
                i = endIdx + 2;
                continue;
            }

            const endTagIdx = code.indexOf(">", i);
            if (endTagIdx === -1) {
                return {
                    isValid: false,
                    error: { type: "html", message: "Unclosed HTML tag '<'", line: curLine, column: curCol }
                };
            }

            const tagText = code.substring(i + 1, endTagIdx).trim();
            const tagLines = code.substring(i, endTagIdx + 1).split("\n");
            line += tagLines.length - 1;
            if (tagLines.length > 1) {
                column = tagLines[tagLines.length - 1].length + 1;
            } else {
                column += tagText.length + 1;
            }
            i = endTagIdx;

            if (tagText.startsWith("/")) {
                const tagName = tagText.slice(1).trim().split(/\s+/)[0].toLowerCase();
                if (selfClosing.has(tagName)) {
                    continue;
                }
                const top = stack.pop();
                if (!top) {
                    return {
                        isValid: false,
                        error: { type: "html", message: `Unexpected closing tag </${tagName}> without opened tag`, line: curLine, column: curCol }
                    };
                }
                if (top.tag !== tagName) {
                    return {
                        isValid: false,
                        error: { type: "html", message: `Tag mismatch: matched </${tagName}> with <${top.tag}>`, line: curLine, column: curCol }
                    };
                }
            } else if (tagText.startsWith("!") || tagText.startsWith("?")) {
                continue;
            } else {
                const isSelfClosing = tagText.endsWith("/");
                const cleanText = isSelfClosing ? tagText.slice(0, -1).trim() : tagText;
                const tagName = cleanText.split(/\s+/)[0].toLowerCase();

                if (!tagName) {
                    continue;
                }

                if (!selfClosing.has(tagName) && !isSelfClosing) {
                    stack.push({ tag: tagName, line: curLine, column: curCol });
                }
            }
        }
    }

    if (stack.length > 0) {
        const top = stack[stack.length - 1];
        return {
            isValid: false,
            error: { type: "html", message: `Unclosed tag <${top.tag}>`, line: top.line, column: top.column }
        };
    }

    return { isValid: true };
}

export function validateSecurity(code: string, type: string): { isValid: boolean; errorMsg?: string } {
    const codeLower = code.toLowerCase();

    // PHP detection
    if (codeLower.includes("<?php") || (codeLower.includes("<?") && type === "html")) {
        return { isValid: false, errorMsg: "PHP execution blocks are prohibited in Custom Code" };
    }

    // Dangerous Node elements
    if (
        codeLower.includes("child_process") ||
        codeLower.includes("require('fs')") ||
        codeLower.includes("require(\"fs\")") ||
        codeLower.includes("require('child_process')") ||
        codeLower.includes("require(\"child_process\")") ||
        codeLower.includes("process.exit") ||
        codeLower.includes("process.env")
    ) {
        return { isValid: false, errorMsg: "Server-side and Node.js process APIs are prohibited" };
    }

    // eval/new Function
    if (/\beval\s*\(/.test(code)) {
        return { isValid: false, errorMsg: "Use of eval() function is prohibited for security reasons" };
    }

    if (/\bnew\s+Function\s*\(/.test(code)) {
        return { isValid: false, errorMsg: "Use of new Function() constructor is prohibited for security reasons" };
    }

    if (/\b(exec|spawn|execSync|spawnSync)\s*\(/.test(code)) {
        return { isValid: false, errorMsg: "Use of system process execution APIs is prohibited" };
    }

    return { isValid: true };
}

export function validateSnippet(
    name: string,
    code: string,
    type: string,
    placement: string,
    conditions: any[],
    environments: string[],
    dependencies?: { type: "javascript" | "css"; url: string }[]
): { isValid: boolean; error?: ValidationError; warning?: ValidationError } {
    if (!name || !name.trim()) {
        return { isValid: false, error: { type: "name", message: "Snippet name cannot be empty" } };
    }
    if (!["javascript", "css", "html"].includes(type)) {
        return { isValid: false, error: { type: "type", message: `Invalid code type: ${type}` } };
    }
    if (!["head", "body-start", "body-end"].includes(placement)) {
        return { isValid: false, error: { type: "placement", message: `Invalid placement: ${placement}` } };
    }

    // Dependencies check
    const seenUrls = new Set<string>();
    for (const dep of dependencies || []) {
        if (!dep || typeof dep !== "object") {
            return { isValid: false, error: { type: "dependency", message: "Dependency must be an object" } };
        }
        if (!["javascript", "css"].includes(dep.type)) {
            return { isValid: false, error: { type: "dependency", message: `Invalid dependency type: ${dep.type}` } };
        }
        if (!dep.url || !dep.url.trim()) {
            return { isValid: false, error: { type: "dependency", message: "Dependency URL cannot be empty" } };
        }
        const trimmedUrl = dep.url.trim();
        const lowerUrl = trimmedUrl.toLowerCase();

        // Normalize URL to detect duplicates
        const normalized = lowerUrl.replace(/\/+$/, "");
        if (seenUrls.has(normalized)) {
            return { isValid: false, error: { type: "dependency", message: `Duplicate dependency URL found: "${trimmedUrl}"` } };
        }
        seenUrls.add(normalized);

        if (
            lowerUrl.startsWith("javascript:") ||
            lowerUrl.startsWith("data:") ||
            lowerUrl.startsWith("vbscript:") ||
            lowerUrl.startsWith("file:")
        ) {
            return { isValid: false, error: { type: "dependency", message: `Unsafe dependency URL scheme found: "${trimmedUrl}"` } };
        }
        try {
            const valUrl = trimmedUrl.startsWith("//") ? `https:${trimmedUrl}` : trimmedUrl;
            const parsed = new URL(valUrl);
            if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
                return { isValid: false, error: { type: "dependency", message: `Dependency URL must use HTTP or HTTPS protocol: "${trimmedUrl}"` } };
            }
        } catch (err) {
            return { isValid: false, error: { type: "dependency", message: `Invalid dependency URL: "${trimmedUrl}"` } };
        }
    }

    // Conditions check
    for (const cond of conditions) {
        if (!cond || typeof cond !== "object") {
            return { isValid: false, error: { type: "condition", message: "Condition structure must be an object" } };
        }
        if (!["device", "environment", "auth"].includes(cond.type)) {
            return { isValid: false, error: { type: "condition", message: `Invalid condition type: ${cond.type}` } };
        }
        if (!["equals", "not_equals"].includes(cond.operator)) {
            return { isValid: false, error: { type: "condition", message: `Invalid condition operator: ${cond.operator}` } };
        }
        if (cond.type === "device" && !["desktop", "tablet", "mobile"].includes(cond.value)) {
            return { isValid: false, error: { type: "condition", message: `Invalid condition value: ${cond.value}` } };
        }
        if (cond.type === "environment" && !["preview", "production"].includes(cond.value)) {
            return { isValid: false, error: { type: "condition", message: `Invalid condition value: ${cond.value}` } };
        }
        if (cond.type === "auth" && !["authenticated", "anonymous"].includes(cond.value)) {
            return { isValid: false, error: { type: "condition", message: `Invalid condition value: ${cond.value}` } };
        }
    }

    // Environments check
    if (!environments || !Array.isArray(environments) || environments.length === 0) {
        return { isValid: false, error: { type: "environments", message: "At least one target environment must be selected" } };
    }
    for (const env of environments) {
        if (!["development", "staging", "production"].includes(env)) {
            return { isValid: false, error: { type: "environments", message: `Invalid environment: ${env}` } };
        }
    }

    // Security Check (MUST never fail)
    const securityCheck = validateSecurity(code, type);
    if (!securityCheck.isValid) {
        return { isValid: false, error: { type: "security", message: securityCheck.errorMsg || "Security validation failed" } };
    }

    // General Syntax Check
    if (type === "javascript") {
        const jsCheck = validateJS(code);
        if (!jsCheck.isValid) {
            return { isValid: false, error: jsCheck.error };
        }
    } else if (type === "css") {
        const cssCheck = validateCSS(code);
        if (!cssCheck.isValid) {
            return { isValid: false, error: cssCheck.error };
        }
    } else if (type === "html") {
        const htmlCheck = validateHTML(code);
        if (!htmlCheck.isValid) {
            return { isValid: false, error: htmlCheck.error };
        }
    }

    return { isValid: true };
}

export interface Conflict {
    severity: "error" | "warning";
    type: string;
    message: string;
    url?: string;
    snippetId?: string;
    snippetName?: string;
}

export function parseCdnUrl(url: string): { library: string; version: string } | null {
    try {
        const parsed = new URL(url.trim().startsWith("//") ? `https:${url.trim()}` : url.trim());
        const hostname = parsed.hostname.toLowerCase();
        const pathname = parsed.pathname;

        // 1. jsDelivr NPM: cdn.jsdelivr.net/npm/package@version/...
        if (hostname.includes("jsdelivr.net")) {
            const m = pathname.match(/^\/npm\/([^@/]+)@([^/]+)/);
            if (m) {
                return { library: m[1].toLowerCase(), version: m[2] };
            }
        }

        // 2. cdnjs: cdnjs.cloudflare.com/ajax/libs/package/version/...
        if (hostname.includes("cdnjs.cloudflare.com")) {
            const m = pathname.match(/^\/ajax\/libs\/([^/]+)\/([^/]+)/);
            if (m) {
                return { library: m[1].toLowerCase(), version: m[2] };
            }
        }

        // 3. unpkg: unpkg.com/package@version/...
        if (hostname.includes("unpkg.com")) {
            const m = pathname.match(/^\/([^@/]+)@([^/]+)/);
            if (m) {
                return { library: m[1].toLowerCase(), version: m[2] };
            }
        }
    } catch (_) { }
    return null;
}

export function getLibraryName(url: string): string {
    const cdn = parseCdnUrl(url);
    if (cdn) return cdn.library;
    try {
        const parsed = new URL(url.trim().startsWith("//") ? `https:${url.trim()}` : url.trim());
        const pathname = parsed.pathname;
        const filename = pathname.substring(pathname.lastIndexOf("/") + 1);
        const name = filename.replace(/\.(min|bundle|all|slim)\.(js|css)$/i, "").replace(/\.(js|css)$/i, "");
        return name.toLowerCase();
    } catch (_) {
        return "";
    }
}

const KNOWN_DEPENDENCIES: Record<string, { requires: string; name: string }> = {
    bootstrap: { requires: "jquery", name: "Bootstrap (v3/v4)" },
    select2: { requires: "jquery", name: "Select2" },
    jqueryui: { requires: "jquery", name: "jQuery UI" },
    "jquery-validation": { requires: "jquery", name: "jQuery Validation" }
};

export function areConditionsMutuallyExclusive(condsA: any[], condsB: any[]): boolean {
    for (const cA of condsA) {
        for (const cB of condsB) {
            if (cA.type === cB.type && cA.operator === "equals" && cB.operator === "equals" && cA.value !== cB.value) {
                return true;
            }
            if (cA.type === cB.type && ((cA.operator === "equals" && cB.operator === "not_equals") || (cA.operator === "not_equals" && cB.operator === "equals")) && cA.value === cB.value) {
                return true;
            }
        }
    }
    return false;
}

export function detectDependencyConflicts(customCodeList: any[]): Conflict[] {
    const conflicts: Conflict[] = [];
    const environments = ["development", "staging", "production"];

    // File extension checks (independent of environment)
    for (const snip of customCodeList) {
        const deps = snip.dependencies || [];
        for (const dep of deps) {
            if (!dep.url) continue;
            try {
                const u = new URL(dep.url.trim().startsWith("//") ? `https:${dep.url.trim()}` : dep.url.trim());
                const pathLower = u.pathname.toLowerCase();
                if (dep.type === "javascript" && pathLower.endsWith(".css")) {
                    conflicts.push({
                        severity: "warning",
                        type: "mismatch",
                        message: `Dependency "${dep.url}" is configured as JavaScript, but the URL filename ends with .css.`,
                        url: dep.url,
                        snippetId: snip.id,
                        snippetName: snip.name
                    });
                }
                if (dep.type === "css" && pathLower.endsWith(".js")) {
                    conflicts.push({
                        severity: "warning",
                        type: "mismatch",
                        message: `Dependency "${dep.url}" is configured as CSS stylesheet, but the URL filename ends with .js.`,
                        url: dep.url,
                        snippetId: snip.id,
                        snippetName: snip.name
                    });
                }
            } catch (_) { }
        }
    }

    for (const env of environments) {
        // 1. Gather active snippets in the environment
        const activeSnippets = customCodeList
            .map((s, idx) => ({ ...s, originalIndex: idx }))
            .filter(snip => {
                const targetEnvs = snip.environments || ["development", "staging", "production"];
                return targetEnvs.includes(env);
            });

        // 2. Flatten active dependencies
        interface FlatDep {
            type: "javascript" | "css";
            url: string;
            requires?: string;
            snippetId: string;
            snippetName: string;
            snippetConditions: any[];
            placement: string;
            snippetIndex: number;
            depIndex: number;
        }

        const flatDeps: FlatDep[] = [];
        activeSnippets.forEach(snip => {
            const deps = snip.dependencies || [];
            deps.forEach((dep: any, dIdx: number) => {
                flatDeps.push({
                    type: dep.type,
                    url: dep.url,
                    requires: dep.requires,
                    snippetId: snip.id,
                    snippetName: snip.name,
                    snippetConditions: snip.conditions || [],
                    placement: snip.placement || "body-end",
                    snippetIndex: snip.originalIndex,
                    depIndex: dIdx
                });
            });
        });

        const getPlacementRank = (p: string) => {
            if (p === "head") return 1;
            if (p === "body-start") return 2;
            return 3; // body-end
        };

        // Helper to evaluate if two flat dependencies have overlapping conditions
        const haveOverlappingConditions = (a: FlatDep, b: FlatDep) => {
            return !areConditionsMutuallyExclusive(a.snippetConditions, b.snippetConditions);
        };

        // A. Version Conflict checks
        const libVersionGroups: Record<string, { url: string; version: string; snippetName: string }[]> = {};
        const libUrlGroups: Record<string, { url: string; snippetName: string; dep: FlatDep }[]> = {};

        flatDeps.forEach(dep => {
            const libName = getLibraryName(dep.url);
            if (!libName) return;

            if (!libUrlGroups[libName]) {
                libUrlGroups[libName] = [];
            }
            const group = libUrlGroups[libName];
            if (!group.some(item => item.url === dep.url && !areConditionsMutuallyExclusive(item.dep.snippetConditions, dep.snippetConditions))) {
                group.push({ url: dep.url, snippetName: dep.snippetName, dep });
            }

            const cdn = parseCdnUrl(dep.url);
            if (cdn) {
                if (!libVersionGroups[libName]) {
                    libVersionGroups[libName] = [];
                }
                const vGroup = libVersionGroups[libName];
                if (!vGroup.some(item => item.url === dep.url)) {
                    vGroup.push({ url: dep.url, version: cdn.version, snippetName: dep.snippetName });
                }
            }
        });

        // Report Version mismatches (ERROR)
        for (const [libName, items] of Object.entries(libVersionGroups)) {
            if (items.length > 1) {
                for (let i = 0; i < items.length; i++) {
                    for (let j = i + 1; j < items.length; j++) {
                        const itemA = items[i];
                        const itemB = items[j];
                        if (itemA.version !== itemB.version) {
                            const depA = flatDeps.find(d => d.url === itemA.url);
                            const depB = flatDeps.find(d => d.url === itemB.url);
                            if (depA && depB && !areConditionsMutuallyExclusive(depA.snippetConditions, depB.snippetConditions)) {
                                conflicts.push({
                                    severity: "error",
                                    type: "version_conflict",
                                    message: `Version conflict: Library "${libName}" is configured with multiple versions in environment "${env}": v${itemA.version} (in snippet "${itemA.snippetName}") and v${itemB.version} (in snippet "${itemB.snippetName}").`,
                                    url: itemB.url
                                });
                            }
                        }
                    }
                }
            }
        }

        // Report multiple sources of same library (WARNING)
        for (const [libName, items] of Object.entries(libUrlGroups)) {
            if (items.length > 1) {
                const uniqueUrls = Array.from(new Set(items.map(item => item.url)));
                if (uniqueUrls.length > 1) {
                    let hasOverlap = false;
                    for (let i = 0; i < items.length; i++) {
                        for (let j = i + 1; j < items.length; j++) {
                            if (items[i].url !== items[j].url && !areConditionsMutuallyExclusive(items[i].dep.snippetConditions, items[j].dep.snippetConditions)) {
                                hasOverlap = true;
                                break;
                            }
                        }
                        if (hasOverlap) break;
                    }
                    if (hasOverlap) {
                        const hasVersionConflict = conflicts.some(c => c.type === "version_conflict" && c.message.includes(`"${libName}"`));
                        if (!hasVersionConflict) {
                            conflicts.push({
                                severity: "warning",
                                type: "duplicate_library",
                                message: `Potential duplicate library: Same library "${libName}" is included from multiple distinct URLs in environment "${env}": "${uniqueUrls[0]}" (snippet "${items[0].snippetName}") and "${uniqueUrls[1]}".`
                            });
                        }
                    }
                }
            }
        }

        // C. Circular dependency cycles (Run this first to avoid false-positive ordering conflicts)
        const adjList: Record<number, number[]> = {};
        flatDeps.forEach((dep, idx) => {
            adjList[idx] = [];
            const reqList: string[] = [];
            if (dep.requires) reqList.push(dep.requires.trim().toLowerCase());
            const libName = getLibraryName(dep.url);
            if (KNOWN_DEPENDENCIES[libName]) reqList.push(KNOWN_DEPENDENCIES[libName].requires);

            reqList.forEach(reqLib => {
                flatDeps.forEach((otherDep, otherIdx) => {
                    if (otherIdx === idx) return;
                    if (!haveOverlappingConditions(otherDep, dep)) return;
                    const otherLib = getLibraryName(otherDep.url);
                    if (otherLib === reqLib || otherDep.url.toLowerCase().includes(reqLib)) {
                        adjList[idx].push(otherIdx);
                    }
                });
            });
        });

        const visited = new Set<number>();
        const recStack = new Set<number>();
        const path: number[] = [];
        const cycleIndices = new Set<number>();

        const dfs = (u: number): boolean => {
            visited.add(u);
            recStack.add(u);
            path.push(u);

            for (const v of adjList[u] || []) {
                if (!visited.has(v)) {
                    if (dfs(v)) return true;
                } else if (recStack.has(v)) {
                    const cyclePath = path.slice(path.indexOf(v));
                    cyclePath.forEach(idx => cycleIndices.add(idx));
                    cyclePath.push(v);
                    const urls = cyclePath.map(idx => flatDeps[idx].url);
                    conflicts.push({
                        severity: "error",
                        type: "circular_dependency",
                        message: `Circular dependency detected in environment "${env}": ${urls.join(" → ")}`
                    });
                    return true;
                }
            }

            recStack.delete(u);
            path.pop();
            return false;
        };

        for (let i = 0; i < flatDeps.length; i++) {
            if (!visited.has(i)) {
                dfs(i);
            }
        }

        // B. Missing & Order conflicts
        flatDeps.forEach((dep, idx) => {
            if (cycleIndices.has(idx)) return;
            const reqList: string[] = [];
            if (dep.requires) {
                reqList.push(dep.requires.trim().toLowerCase());
            }
            const libName = getLibraryName(dep.url);
            if (KNOWN_DEPENDENCIES[libName]) {
                const reqLib = KNOWN_DEPENDENCIES[libName].requires;
                if (!reqList.includes(reqLib)) {
                    reqList.push(reqLib);
                }
            }

            reqList.forEach((reqLib) => {
                const providers = flatDeps.filter(p => {
                    if (p.snippetId === dep.snippetId && p.depIndex === dep.depIndex) return false;
                    if (!haveOverlappingConditions(p, dep)) return false;
                    const pLib = getLibraryName(p.url);
                    return pLib === reqLib || p.url.toLowerCase().includes(reqLib);
                });

                if (providers.length === 0) {
                    conflicts.push({
                        severity: "error",
                        type: "missing_dependency",
                        message: `Missing dependency: "${dep.url}" in snippet "${dep.snippetName}" requires library "${reqLib}" which is not configured in environment "${env}".`,
                        url: dep.url,
                        snippetId: dep.snippetId,
                        snippetName: dep.snippetName
                    });
                } else {
                    const runsBefore = providers.some(p => {
                        const rankP = getPlacementRank(p.placement);
                        const rankD = getPlacementRank(dep.placement);
                        if (rankP < rankD) return true;
                        if (rankP > rankD) return false;
                        if (p.snippetId === dep.snippetId) {
                            return p.depIndex < dep.depIndex;
                        }
                        return p.snippetIndex < dep.snippetIndex;
                    });

                    if (!runsBefore) {
                        conflicts.push({
                            severity: "error",
                            type: "ordering_conflict",
                            message: `Dependency order conflict: "${dep.url}" in snippet "${dep.snippetName}" requires library "${reqLib}" to load first, but "${providers[0].url}" loads after it.`,
                            url: dep.url,
                            snippetId: dep.snippetId,
                            snippetName: dep.snippetName
                        });
                    }
                }
            });
        });
    }

    const seenMessages = new Set<string>();
    const uniqConflicts = conflicts.filter(c => {
        const key = `${c.severity}:${c.type}:${c.message}`;
        if (seenMessages.has(key)) return false;
        seenMessages.add(key);
        return true;
    });

    return uniqConflicts;
}
