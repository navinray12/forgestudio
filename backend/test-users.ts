import { prisma } from './src/config/prisma.js';

async function main() {
    const users = await prisma.user.findMany();
    console.log("Found users in DB:", users.length);
    for (const u of users) {
        console.log(`User ID: ${u.id}, Email: ${u.email}, PasswordHash: ${!!u.passwordHash}, Status: ${u.status}`);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
