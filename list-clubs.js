// Minimal club list diagnostic
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  try {
    const clubs = await prisma.club.findMany({ take: 5, orderBy: { createdAt: 'asc' } });
    console.log('Club count:', clubs.length);
    clubs.forEach(c => console.log(`ID=${c.id} name=${c.name}`));
  } catch (e) {
    console.error('Error listing clubs:', e);
  } finally {
    await prisma.$disconnect();
  }
})();
