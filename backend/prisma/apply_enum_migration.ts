import prisma from '../src/config/prisma';

async function main() {
  const values = await prisma.$queryRawUnsafe<Array<{ enumlabel: string }>>(`
    SELECT e.enumlabel
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'UserRole'
  `);
  console.log('Current UserRole enum values:', values.map(v => v.enumlabel));
  
  const toAdd = ['PLATFORM_ADMIN', 'SUPPORT_ADMIN', 'DEVELOPER', 'AI_CONTENT_ADMIN', 'TEAM_MEMBER'];
  for (const val of toAdd) {
    try {
      await prisma.$executeRawUnsafe(`ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS '${val}'`);
      console.log('Added or verified enum value:', val);
    } catch (e: any) {
      console.log('Error adding', val, e.message);
    }
  }

  const updated = await prisma.$queryRawUnsafe<Array<{ enumlabel: string }>>(`
    SELECT e.enumlabel
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'UserRole'
  `);
  console.log('Updated UserRole enum values:', updated.map(v => v.enumlabel));
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
