import { cp, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(scriptDirectory, "..");
const source = path.join(backendRoot, "src", "generated", "prisma");
const destination = path.join(backendRoot, "dist", "generated", "prisma");

await mkdir(path.dirname(destination), { recursive: true });
await cp(source, destination, { recursive: true, force: true });
console.log("Copied generated Prisma runtime to dist/generated/prisma.");
