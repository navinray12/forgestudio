import { spawn } from "child_process";

export interface ComposerStatus {
    composerAvailable: boolean;
    composerVersion: string | null;
    phpAvailable: boolean;
    phpVersion: string | null;
    composerJsonExists: boolean;
    vendorExists: boolean;
    autoloadExists: boolean;
    projectPath: string;
}

export interface ComposerOperationResult {
    success: boolean;
    operation: string;
    output: string;
    error: string | null;
    exitCode: number;
}

// Safe package name regex: vendor/package
const SAFE_PACKAGE_REGEX = /^[a-z0-9]([a-z0-9_-]*\/[a-z0-9_.-]+)$/i;
// Safe version constraint regex
const SAFE_VERSION_REGEX = /^[\^~>=<\d.* |&,]+$/;

/** Run a command safely with argument arrays (no shell injection). */
function runSafely(
    cmd: string,
    args: string[],
    cwd: string,
    timeoutMs = 120_000
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve) => {
        let stdout = "";
        let stderr = "";

        const proc = spawn(cmd, args, {
            cwd,
            shell: false, // Explicitly no shell to prevent injection
            timeout: timeoutMs,
            env: { ...process.env, COMPOSER_NO_INTERACTION: "1" },
        });

        proc.stdout?.on("data", (d: Buffer) => { stdout += d.toString(); });
        proc.stderr?.on("data", (d: Buffer) => { stderr += d.toString(); });

        proc.on("close", (code) => {
            resolve({ stdout, stderr, exitCode: code ?? 1 });
        });

        proc.on("error", (err) => {
            resolve({ stdout: "", stderr: err.message, exitCode: 1 });
        });
    });
}

/** Detect Composer + PHP environment safely (server-side only). */
export async function detectComposerStatus(projectPath: string): Promise<ComposerStatus> {
    const fs = await import("fs");
    const path = await import("path");

    // Detect Composer
    const composerRun = await runSafely("composer", ["--version", "--no-ansi"], projectPath, 10_000);
    const composerAvailable = composerRun.exitCode === 0;
    const composerVersionMatch = composerRun.stdout.match(/Composer version (\S+)/i);
    const composerVersion = composerAvailable ? (composerVersionMatch?.[1] ?? "unknown") : null;

    // Detect PHP
    const phpRun = await runSafely("php", ["--version"], projectPath, 10_000);
    const phpAvailable = phpRun.exitCode === 0;
    const phpVersionMatch = phpRun.stdout.match(/PHP (\d+\.\d+\.\d+)/i);
    const phpVersion = phpAvailable ? (phpVersionMatch?.[1] ?? "unknown") : null;

    // Filesystem checks
    const composerJsonExists = fs.existsSync(path.join(projectPath, "composer.json"));
    const vendorExists = fs.existsSync(path.join(projectPath, "vendor"));
    const autoloadExists = fs.existsSync(path.join(projectPath, "vendor", "autoload.php"));

    return {
        composerAvailable,
        composerVersion,
        phpAvailable,
        phpVersion,
        composerJsonExists,
        vendorExists,
        autoloadExists,
        projectPath,
    };
}

/** Validate composer.json structure safely. */
export async function validateComposerJson(projectPath: string): Promise<ComposerOperationResult> {
    const result = await runSafely("composer", ["validate", "--no-ansi"], projectPath);
    return {
        success: result.exitCode === 0,
        operation: "validate",
        output: result.stdout,
        error: result.exitCode !== 0 ? result.stderr : null,
        exitCode: result.exitCode,
    };
}

/** Run `composer install` (respects composer.lock). */
export async function composerInstall(projectPath: string): Promise<ComposerOperationResult> {
    // composer install: uses lock file, does NOT update versions
    const result = await runSafely(
        "composer",
        ["install", "--no-interaction", "--no-ansi", "--prefer-dist"],
        projectPath
    );
    return {
        success: result.exitCode === 0,
        operation: "install",
        output: result.stdout + result.stderr,
        error: result.exitCode !== 0 ? result.stderr : null,
        exitCode: result.exitCode,
    };
}

/** Run `composer update` for a specific validated package or all packages. */
export async function composerUpdate(
    projectPath: string,
    packageName?: string,
    versionConstraint?: string
): Promise<ComposerOperationResult> {
    // Validate package name before execution
    if (packageName) {
        if (!SAFE_PACKAGE_REGEX.test(packageName)) {
            return {
                success: false,
                operation: "update",
                output: "",
                error: `Invalid package name: "${packageName}". Must match vendor/package format.`,
                exitCode: 1,
            };
        }
        if (versionConstraint && !SAFE_VERSION_REGEX.test(versionConstraint)) {
            return {
                success: false,
                operation: "update",
                output: "",
                error: `Invalid version constraint: "${versionConstraint}".`,
                exitCode: 1,
            };
        }
    }

    const args = ["update", "--no-interaction", "--no-ansi"];
    if (packageName) args.push(packageName);

    const result = await runSafely("composer", args, projectPath);
    return {
        success: result.exitCode === 0,
        operation: "update",
        output: result.stdout + result.stderr,
        error: result.exitCode !== 0 ? result.stderr : null,
        exitCode: result.exitCode,
    };
}
