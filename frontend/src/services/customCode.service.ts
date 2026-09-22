/**
 * @file Custom Code service: services module support.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
const API_URL = `${import.meta.env.VITE_API_URL ?? "http://localhost:5000"}/api/v1`;

export interface CustomCodeSnippet {
    id: string;
    websiteId: string;
    title: string;
    language: "HTML" | "CSS" | "JS";
    code: string;
    placement: "HEAD" | "BODY_TOP" | "BODY_BOTTOM";
    scope: "GLOBAL" | "PAGE";
    pageId: string | null;
    isActive: boolean;
    conditions?: { pages?: string[]; devices?: string[] } | null;
    priority?: number;
    status?: "DRAFT" | "PUBLISHED" | "SCHEDULED";
    scheduledFor?: string | null;
    createdAt: string;
    updatedAt: string;
}

/**
 * Get Custom Code Snippets.
 * @param websiteId Identifier of the website whose data is being read or changed.
 */
export async function getCustomCodeSnippets(websiteId: string): Promise<CustomCodeSnippet[]> {
    try {
        const response = await fetch(`${API_URL}/custom-code/website/${websiteId}`, {
            method: "GET",
            credentials: "include",
        });

        if (!response.ok) return [];
        const data = await response.json();
        return data.success ? data.snippets : [];
    } catch (error) {
        console.error("Failed to fetch custom code snippets:", error);
        return [];
    }
}

/**
 * Create Custom Code Snippet.
 * @param websiteId Identifier of the website whose data is being read or changed.
 * @param snippetData Snippet Data supplied to this operation (type: Partial<CustomCodeSnippet>).
 */
export async function createCustomCodeSnippet(websiteId: string, snippetData: Partial<CustomCodeSnippet>): Promise<any> {
    try {
        const response = await fetch(`${API_URL}/custom-code/website/${websiteId}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify(snippetData),
        });

        return await response.json();
    } catch (error: any) {
        console.error("Failed to create custom code snippet:", error);
        return { success: false, message: error.message };
    }
}

/**
 * Update Custom Code Snippet.
 * @param snippetId Snippet Id supplied to this operation (type: string).
 * @param snippetData Snippet Data supplied to this operation (type: Partial<CustomCodeSnippet>).
 */
export async function updateCustomCodeSnippet(snippetId: string, snippetData: Partial<CustomCodeSnippet>): Promise<any> {
    try {
        const response = await fetch(`${API_URL}/custom-code/${snippetId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify(snippetData),
        });

        return await response.json();
    } catch (error: any) {
        console.error("Failed to update custom code snippet:", error);
        return { success: false, message: error.message };
    }
}

/**
 * Delete Custom Code Snippet.
 * @param snippetId Snippet Id supplied to this operation (type: string).
 */
export async function deleteCustomCodeSnippet(snippetId: string): Promise<boolean> {
    try {
        const response = await fetch(`${API_URL}/custom-code/${snippetId}`, {
            method: "DELETE",
            credentials: "include",
        });

        return response.ok;
    } catch (error) {
        console.error("Failed to delete custom code snippet:", error);
        return false;
    }
}
