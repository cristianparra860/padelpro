const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAPIView() {
  const ts = new Date('2025-11-24T07:00:00').getTime();
  
  console.log('🔍 VISTA API (courtId IS NULL - disponibles):\n');
  
  const available = await prisma.$queryRawUnsafe(`
    SELECT ts.*, i.name as instructorName,
           (SELECT COUNT(*) FROM Booking WHERE timeSlotId = ts.id AND status != 'CANCELLED') as bookingCount
    FROM TimeSlot ts
    JOIN Instructor i ON ts.instructorId = i.id
    WHERE ts.start = ${ts}
    AND ts.courtId IS NULL
    ORDER BY i.name
  `);
  
  console.log(`📊 Tarjetas DISPONIBLES (sin pista asignada): ${available.length}\n`);
  
  available.forEach(s => {
    console.log(`👨‍🏫 ${s.instructorName}: ${s.level}/${s.genderCategory || 'N/A'} (${s.bookingCount} reservas)`);
  });
  
  console.log('\n🔍 VISTA COMPLETA (TODAS las tarjetas):\n');
  
  const all = await prisma.$queryRawUnsafe(`
    SELECT ts.*, i.name as instructorName,
           (SELECT COUNT(*) FROM Booking WHERE timeSlotId = ts.id AND status != 'CANCELLED') as bookingCount
    FROM TimeSlot ts
    JOIN Instructor i ON ts.instructorId = i.id
    WHERE ts.start = ${ts}
    ORDER BY i.name, ts.level DESC
  `);
  
  console.log(`📊 TODAS las tarjetas: ${all.length}\n`);
  
  const byInst = {};
  all.forEach(s => {
    if (!byInst[s.instructorName]) byInst[s.instructorName] = [];
    byInst[s.instructorName].push(s);
  });
  
  Object.entries(byInst).forEach(([inst, cards]) => {
    console.log(`👨‍🏫 ${inst}:`);
    cards.forEach(s => {
      const status = s.courtId ? `✅ Pista ${s.courtNumber}` : '⏳ Disponible';
      console.log(`   ${s.level.padEnd(12)} | ${(s.genderCategory||'N/A').padEnd(10)} | ${status} | ${s.bookingCount} reservas`);
    });
  });
  
  console.log('\n💡 EXPLICACIÓN:\n');
  console.log('El frontend muestra solo tarjetas con courtId=NULL (disponibles).');
  console.log('Cuando completas una carrera con groupSize=1, se asigna pista inmediatamente.');
  console.log('Por eso ves 5 en lugar de 6: la tarjeta confirmada ya no aparece como "disponible".\n');
  
  prisma.$disconnect();
}

checkAPIView();
