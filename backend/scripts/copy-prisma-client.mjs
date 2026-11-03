import { cp, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
// TypeScript does not copy the generated JavaScript/WASM client used by dist/config/prisma.js.
const source = fileURLToPath(new URL("../src/generated/prisma/", import.meta.url));
const target = fileURLToPath(new URL("../dist/generated/prisma/", import.meta.url));
await mkdir(target, { recursive: true });
await cp(source, target, { recursive: true });

// Ship the public SDK source for the authenticated Developer Tools download.
await (await import("node:fs/promises")).copyFile(new URL("../src/sdk/client.ts",import.meta.url),new URL("../dist/sdk/client.ts",import.meta.url));
