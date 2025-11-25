const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const deleted = await prisma.booking.deleteMany({
    where: { userId: 'user-1763677035576-wv1t7iun0' }
  });
  console.log('✅ Eliminadas', deleted.count, 'reservas de Juan Pérez');
  await prisma.$disconnect();
})();
