const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTimeSlots() {
  const slots = await prisma.$queryRaw`
    SELECT 
      id,
      start,
      level,
      genderCategory,
      courtNumber
    FROM TimeSlot
    WHERE start >= ${new Date('2025-10-17T09:00:00').getTime()}
    AND start <= ${new Date('2025-10-17T10:00:00').getTime()}
    ORDER BY start ASC
  `;

  console.log('\n📋 TimeSlots de 09:00 y 10:00:\n');
  slots.forEach((slot, i) => {
    console.log(`${i + 1}. TimeSlot ID: ${slot.id}`);
    console.log(`   Hora: ${new Date(slot.start).toLocaleString()}`);
    console.log(`   Nivel: ${slot.level}`);
    console.log(`   Categoría: ${slot.genderCategory || 'NO DEFINIDA'}`);
    console.log(`   Pista: ${slot.courtNumber || 'SIN ASIGNAR'}\n`);
  });

  await prisma.$disconnect();
}

checkTimeSlots();
