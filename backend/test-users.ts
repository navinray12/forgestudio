/**
 * @file Test users: backend module support.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import { prisma } from './src/platform/database/prisma.js';

/**
 * Main.
 */
async function main() {
    const users = await prisma.user.findMany();
    console.log("Found users in DB:", users.length);
    for (const u of users) {
        console.log(`User ID: ${u.id}, Email: ${u.email}, PasswordHash: ${!!u.passwordHash}, Status: ${u.status}`);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
