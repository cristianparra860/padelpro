const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  console.log('\n🧹 Limpiando TimeSlot fantasma...\n');
  
  await prisma.timeSlot.update({
    where: { id: 'ts_1763530269399_0fyqmvnns' },
    data: { courtNumber: null }
  });
  
  console.log('✅ Pista 1 liberada del TimeSlot ts_1763530269399_0fyqmvnns\n');
  
  await prisma.$disconnect();
})();
