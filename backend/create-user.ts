import { prisma } from './src/config/prisma.js';
import { hashPassword } from './src/utils/password.js';

async function main() {
    const email = 'kevin@gmail.com';
    const plainPassword = 'password123';
    const passwordHash = await hashPassword(plainPassword);

    const user = await prisma.user.upsert({
        where: { email },
        update: {
            passwordHash,
            status: 'ACTIVE',
            emailVerified: true
        },
        create: {
            email,
            fullName: 'Kevin',
            passwordHash,
            status: 'ACTIVE',
            emailVerified: true
        }
    });

    console.log('Created/Updated user:', user.email);
    console.log('Password has been set to: password123');
}

main().catch(console.error).finally(() => prisma.$disconnect());
