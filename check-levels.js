const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLevels() {
  try {
    // Ver niveles de propuestas (courtId = null)
    const proposals = await prisma.timeSlot.findMany({
      where: { courtId: null },
      select: { level: true },
      distinct: ['level']
    });
    
    console.log('📊 Niveles en propuestas (courtId = null):');
    proposals.forEach(p => console.log(`  - ${p.level}`));
    
    // Ver niveles de usuarios
    const users = await prisma.user.findMany({
      select: { level: true },
      distinct: ['level']
    });
    
    console.log('\n👥 Niveles de usuarios:');
    users.forEach(u => console.log(`  - ${u.level}`));
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkLevels();
