// verify-user-ids-simple.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true },
    take: 5
  });

  console.log('\n=== USUARIOS EN BD ===\n');
  users.forEach(u => {
    console.log(`Name: ${u.name}`);
    console.log(`ID: "${u.id}" (length: ${u.id.length}, type: ${typeof u.id})`);
    console.log(`Email: ${u.email}`);
    console.log(`Role: ${u.role}\n`);
  });

  await prisma.$disconnect();
}

main().catch(console.error);
