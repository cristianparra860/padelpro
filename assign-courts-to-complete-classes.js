const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function assignCourtsToCompleteClasses() {
  console.log('🔍 Buscando clases completas sin pista asignada...\n');

  try {
    // Buscar todas las clases sin pista asignada
    const slots = await prisma.$queryRaw`
      SELECT 
        ts.id,
        ts.clubId,
        ts.start,
        ts.end,
        ts.maxPlayers,
        ts.courtNumber,
        COUNT(b.id) as bookingsCount
      FROM TimeSlot ts
      LEFT JOIN Booking b ON b.timeSlotId = ts.id AND b.status = 'CONFIRMED'
      WHERE ts.courtNumber IS NULL
      AND ts.start >= datetime('now')
      GROUP BY ts.id
      HAVING COUNT(b.id) >= ts.maxPlayers
      ORDER BY ts.start
      LIMIT 20
    `;

    console.log(`✅ Encontradas ${slots.length} clases completas sin pista\n`);

    if (slots.length === 0) {
      console.log('No hay clases completas que necesiten pista');
      return;
    }

    let assigned = 0;
    let failed = 0;

    for (const slot of slots) {
      const date = new Date(slot.start);
      const bookedCount = Number(slot.bookingsCount);
      
      console.log(`\n📅 Clase: ${date.toLocaleString('es-ES')}`);
      console.log(`   👥 ${bookedCount}/${slot.maxPlayers} jugadores`);
      console.log(`   🔍 Buscando pista disponible...`);

      // Buscar pistas del club
      const allCourts = await prisma.$queryRaw`
        SELECT c.id, c.number
        FROM Court c
        WHERE c.clubId = ${slot.clubId}
        ORDER BY c.number
      `;

      if (allCourts.length === 0) {
        console.log(`   ❌ No hay pistas en este club`);
        failed++;
        continue;
      }

      // Buscar pistas ocupadas en ese horario
      const occupiedCourts = await prisma.$queryRaw`
        SELECT ts.courtNumber
        FROM TimeSlot ts
        WHERE ts.clubId = ${slot.clubId}
        AND ts.courtNumber IS NOT NULL
        AND ts.start = ${slot.start}
        AND ts.id != ${slot.id}
      `;

      const occupiedNumbers = occupiedCourts.map(c => c.courtNumber);
      const availableCourt = allCourts.find(c => !occupiedNumbers.includes(c.number));

      if (!availableCourt) {
        console.log(`   ❌ No hay pistas disponibles (todas ocupadas)`);
        failed++;
        continue;
      }

      // Asignar la pista
      await prisma.$executeRaw`
        UPDATE TimeSlot 
        SET courtNumber = ${availableCourt.number}, 
            courtId = ${availableCourt.id},
            updatedAt = datetime('now')
        WHERE id = ${slot.id}
      `;

      console.log(`   ✅ Pista ${availableCourt.number} asignada correctamente`);
      assigned++;
    }

    console.log(`\n\n📊 Resumen:`);
    console.log(`   ✅ Pistas asignadas: ${assigned}`);
    console.log(`   ❌ Fallos: ${failed}`);
    console.log(`   📝 Total procesado: ${slots.length}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

assignCourtsToCompleteClasses();
