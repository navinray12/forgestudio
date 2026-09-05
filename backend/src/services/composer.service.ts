import { execFile } from "child_process";
import fs from "fs/promises";
import path from "path";

const INTEGRATION_DIR = path.join(process.cwd(), "integrations", "php");

// Ensure execution directory exists safely
async function ensureDir() {
    try {
        await fs.access(INTEGRATION_DIR);
    } catch {
        await fs.mkdir(INTEGRATION_DIR, { recursive: true });
    }
}

export type ComposerStatus = {
    available: boolean;
    version?: string;
    phpAvailable: boolean;
    phpVersion?: string;
    error?: string;
};

const execSafe = (command: string, args: string[], cwd: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        execFile(command, args, { cwd, timeout: 30000 }, (error, stdout, stderr) => {
            if (error) {
                reject({ error, stdout, stderr });
            } else {
                resolve(stdout.trim());
            }
        });
    });
};

export async function checkComposerEnvironment(): Promise<ComposerStatus> {
    const status: ComposerStatus = { available: false, phpAvailable: false };

    // Check PHP
    try {
        const phpOutput = await execSafe("php", ["-v"], process.cwd());
        const match = phpOutput.match(/^PHP\s+([0-9\.]+)/);
        status.phpAvailable = true;
        status.phpVersion = match ? match[1] : "Unknown";
    } catch (e) {
        status.error = "PHP binary not found or inaccessible.";
    }

    // Check Composer
    try {
        const compOutput = await execSafe("composer", ["--version", "--no-interaction"], process.cwd());
        const match = compOutput.match(/^Composer\s+version\s+([0-9\.\-[a-zA-Z]+)/);
        status.available = true;
        if (match) status.version = match[1];
    } catch (e) {
        status.error = status.error ? status.error + " | Composer binary not found." : "Composer binary not found.";
    }

    return status;
}

export async function validateComposerConfig(configString: string): Promise<boolean> {
    try {
        const parsed = JSON.parse(configString);
        if (typeof parsed !== 'object' || Array.isArray(parsed)) return false;

        await ensureDir();
        const tempFile = path.join(INTEGRATION_DIR, "composer.json");
        await fs.writeFile(tempFile, configString, "utf8");

        await execSafe("composer", ["validate", "--no-check-all", "--no-check-publish"], INTEGRATION_DIR);
        return true;
    } catch (e) {
        return false;
    }
}

export async function runComposerInstall(): Promise<{ success: boolean; output: string }> {
    await ensureDir();
    try {
        // Safe lock file reproducible install
        const output = await execSafe("composer", ["install", "--no-interaction", "--no-dev", "--optimize-autoloader"], INTEGRATION_DIR);
        return { success: true, output };
    } catch (e: any) {
        return { success: false, output: e.stderr || e.stdout || e.error?.message || "Install Failed" };
    }
}
