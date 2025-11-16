const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function prepareTestSlot() {
  console.log('🧪 Preparando TimeSlot de prueba para reserva\n');
  
  // Buscar un TimeSlot sin reservas
  const emptySlots = await prisma.$queryRaw`
    SELECT ts.id, ts.start, ts.courtNumber, ts.genderCategory, ts.level,
           COUNT(b.id) as bookingCount
    FROM TimeSlot ts
    LEFT JOIN Booking b ON ts.id = b.timeSlotId AND b.status != 'CANCELLED'
    WHERE ts.clubId = 'padel-estrella-madrid'
    AND ts.start > ${Date.now()}
    AND ts.courtId IS NULL
    GROUP BY ts.id
    HAVING bookingCount = 0
    ORDER BY ts.start ASC
    LIMIT 5
  `;
  
  console.log(`📅 TimeSlots vacíos disponibles: ${emptySlots.length}\n`);
  
  if (emptySlots.length > 0) {
    emptySlots.forEach((slot, i) => {
      console.log(`${i+1}. ID: ${slot.id}`);
      console.log(`   Hora: ${new Date(Number(slot.start)).toLocaleString()}`);
      console.log(`   Pista: ${slot.courtNumber || 'SIN ASIGNAR'}`);
      console.log(`   Categoría: ${slot.genderCategory || 'SIN CATEGORÍA'}`);
      console.log(`   Nivel: ${slot.level}\n`);
    });
    
    console.log(`\n🎯 TimeSlot recomendado para prueba: ${emptySlots[0].id}`);
    console.log(`   Hora: ${new Date(Number(emptySlots[0].start)).toLocaleString()}`);
  } else {
    console.log('❌ No hay TimeSlots vacíos disponibles');
  }
  
  await prisma.$disconnect();
}

prepareTestSlot().catch(console.error);
