// verify-points.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const users = await prisma.user.findMany({
      where: { role: 'PLAYER' },
      select: { email: true, points: true },
      orderBy: { email: 'asc' }
    });
    
    console.log('📊 Puntos actuales de usuarios:');
    users.forEach(u => {
      console.log(`  ✅ ${u.email}: ${u.points} puntos`);
    });
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
})();
