import { type Request, type Response } from "express";

const BUILDER_API_VERSION = "1.0.0";

const SUPPORTED_CAPABILITIES = new Set([
    "element",
    "widget",
    "settings",
    "shortcode",
    "api",
    "custom-code",
]);

/** POST /api/v1/plugins/check-compatibility
 *  Body: ThirdPartyPluginManifest (JSON)
 *  Validates a third-party plugin manifest without executing any code.
 */
export function pluginCompatibilityHandler(req: Request, res: Response) {
    try {
        const manifest = req.body as {
            id?: string;
            name?: string;
            version?: string;
            apiVersion?: string;
            capabilities?: string[];
            dependencies?: string[];
            author?: string;
            description?: string;
        };

        // --- Manifest validation ---
        const errors: string[] = [];

        if (!manifest.id || typeof manifest.id !== "string" || !/^[a-z0-9-_]+$/i.test(manifest.id)) {
            errors.push("Invalid or missing plugin ID (alphanumeric, hyphens, underscores only).");
        }

        if (!manifest.name || typeof manifest.name !== "string" || manifest.name.trim().length < 2) {
            errors.push("Invalid or missing plugin name.");
        }

        if (!manifest.version || typeof manifest.version !== "string" || !/^\d+\.\d+\.\d+/.test(manifest.version)) {
            errors.push("Invalid or missing plugin version (semver required: x.y.z).");
        }

        // --- API version check ---
        if (manifest.apiVersion && manifest.apiVersion !== BUILDER_API_VERSION) {
            return res.status(409).json({
                success: false,
                compatible: false,
                result: "Incompatible API version",
                detail: `Plugin requires API version ${manifest.apiVersion}, but builder supports ${BUILDER_API_VERSION}.`,
                errors,
            });
        }

        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                compatible: false,
                result: "Invalid manifest",
                errors,
            });
        }

        // --- Capabilities check ---
        const unsupportedCaps = (manifest.capabilities || []).filter(
            (c) => !SUPPORTED_CAPABILITIES.has(c)
        );
        if (unsupportedCaps.length > 0) {
            return res.status(409).json({
                success: false,
                compatible: false,
                result: "Unsupported capability",
                detail: `Unsupported capabilities: ${unsupportedCaps.join(", ")}`,
            });
        }

        // --- Dependencies check (server-side we can only check format; runtime registry check is frontend) ---
        const invalidDeps = (manifest.dependencies || []).filter(
            (d) => typeof d !== "string" || d.trim() === ""
        );
        if (invalidDeps.length > 0) {
            return res.status(400).json({
                success: false,
                compatible: false,
                result: "Invalid manifest",
                errors: [`Malformed dependency declarations.`],
            });
        }

        // --- Passed all checks ---
        return res.json({
            success: true,
            compatible: true,
            result: "Compatible",
            builderApiVersion: BUILDER_API_VERSION,
            validatedManifest: {
                id: manifest.id,
                name: manifest.name,
                version: manifest.version,
                apiVersion: manifest.apiVersion || BUILDER_API_VERSION,
                capabilities: manifest.capabilities || [],
                dependencies: manifest.dependencies || [],
            },
        });
    } catch (err: any) {
        res.status(500).json({ success: false, message: "Compatibility check failed.", error: err.message });
    }
}
