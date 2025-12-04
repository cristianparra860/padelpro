const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateToCorrectIndex() {
  const slotId = 'ts-1764308189412-z9y4veby1rd';
  
  console.log('🔧 Actualizando índice a 6 (primera plaza de modalidad 4)...');
  
  const updated = await prisma.timeSlot.update({
    where: { id: slotId },
    data: { creditsSlots: '[6]' }
  });
  
  console.log('✅ Actualizado creditsSlots a [6]');
  console.log('Verificación:', updated.creditsSlots);
  
  await prisma.$disconnect();
}

updateToCorrectIndex();
