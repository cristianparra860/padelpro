const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('\n🔍 Verificando TimeSlots para 2025-11-25 07:00...\n');

  // Buscar por el timestamp exacto que usa el API
  const targetStart = new Date('2025-11-25T07:00:00.000Z');
  console.log('📅 Buscando con start:', targetStart.toISOString());
  console.log('📅 Timestamp:', targetStart.getTime());

  const exactMatch = await prisma.timeSlot.findMany({
    where: {
      clubId: 'padel-estrella-madrid',
      start: targetStart
    }
  });

  console.log(`✅ TimeSlots con match exacto: ${exactMatch.length}`);
  
  if (exactMatch.length > 0) {
    console.log('\n📋 Detalles:');
    exactMatch.forEach(slot => {
      console.log({
        id: slot.id.substring(0, 30),
        start: slot.start,
        courtId: slot.courtId ? slot.courtId.substring(0, 20) : 'NULL',
        courtNumber: slot.courtNumber,
        level: slot.level,
        genderCategory: slot.genderCategory
      });
    });
  }

  // Buscar cualquier TimeSlot del 25 de noviembre
  const anyOnNov25 = await prisma.$queryRawUnsafe(`
    SELECT * FROM TimeSlot
    WHERE clubId = 'padel-estrella-madrid'
    AND start >= ${new Date('2025-11-25T00:00:00.000Z').getTime()}
    AND start < ${new Date('2025-11-26T00:00:00.000Z').getTime()}
    ORDER BY start
    LIMIT 10
  `);

  console.log(`\n📅 TimeSlots del 25 de noviembre (primeros 10): ${anyOnNov25.length}`);
  if (anyOnNov25.length > 0) {
    console.log('\n📋 Primeros slots del día:');
    anyOnNov25.forEach(slot => {
      const slotDate = new Date(slot.start);
      console.log({
        start: slotDate.toISOString(),
        hora: slotDate.toLocaleTimeString('es-ES'),
        courtId: slot.courtId ? 'ASSIGNED' : 'NULL',
        courtNumber: slot.courtNumber
      });
    });
  }

  await prisma.$disconnect();
}

main().catch(console.error);
