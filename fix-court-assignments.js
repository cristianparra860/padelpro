// Script para asignar pistas a clases completas que no tienen pista asignada
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findAvailableCourt(startTime, endTime) {
  try {
    // Buscar qué pistas están ocupadas en ese horario
    const occupiedCourts = await prisma.$queryRaw`
      SELECT DISTINCT courtNumber FROM TimeSlot 
      WHERE courtNumber IS NOT NULL 
      AND courtNumber > 0
      AND (
        (start <= ${startTime} AND end > ${startTime})
        OR (start < ${endTime} AND end >= ${endTime})
        OR (start >= ${startTime} AND end <= ${endTime})
      )
    `;

    const occupiedNumbers = occupiedCourts.map(c => c.courtNumber);
    console.log(`  🎾 Pistas ocupadas:`, occupiedNumbers);

    // Buscar la primera pista libre (1-4)
    for (let court = 1; court <= 4; court++) {
      if (!occupiedNumbers.includes(court)) {
        console.log(`  ✅ Pista ${court} disponible`);
        return court;
      }
    }

    // Si todas están ocupadas, asignar 1 (overflow)
    console.log(`  ⚠️ Todas las pistas ocupadas, asignando pista 1`);
    return 1;
  } catch (error) {
    console.error('  ❌ Error buscando pista disponible:', error);
    return 1;
  }
}

async function fixCourtAssignments() {
  try {
    console.log('🔍 Buscando TimeSlots sin pista asignada...\n');

    // Obtener todos los TimeSlots sin pista asignada
    const slotsWithoutCourt = await prisma.$queryRaw`
      SELECT id, start, end, courtNumber FROM TimeSlot 
      WHERE courtNumber IS NULL OR courtNumber = 0
      ORDER BY start ASC
    `;

    console.log(`📊 Encontrados ${slotsWithoutCourt.length} TimeSlots sin pista asignada\n`);

    let updated = 0;
    let skipped = 0;

    for (const slot of slotsWithoutCourt) {
      console.log(`\n🔍 Revisando TimeSlot: ${slot.id.substring(0, 12)}...`);
      console.log(`   Horario: ${slot.start} - ${slot.end}`);
      console.log(`   Pista actual: ${slot.courtNumber || 'sin asignar'}`);

      // Obtener todas las reservas de este TimeSlot
      const bookings = await prisma.$queryRaw`
        SELECT groupSize, status FROM Booking 
        WHERE timeSlotId = ${slot.id}
        AND status IN ('PENDING', 'CONFIRMED')
      `;

      console.log(`   📋 Reservas encontradas: ${bookings.length}`);

      // Verificar cada modalidad (1, 2, 3, 4)
      let shouldAssignCourt = false;

      for (const modalitySize of [1, 2, 3, 4]) {
        const modalityBookings = bookings.filter(b => b.groupSize === modalitySize);
        const count = modalityBookings.length;

        console.log(`   👥 Modalidad ${modalitySize}: ${count}/${modalitySize} reservas`);

        if (count >= modalitySize) {
          console.log(`   ✅ Modalidad ${modalitySize} COMPLETA!`);
          shouldAssignCourt = true;
          break; // Con una modalidad completa es suficiente
        }
      }

      if (shouldAssignCourt) {
        // Buscar pista disponible
        const availableCourt = await findAvailableCourt(slot.start, slot.end);

        // Asignar la pista
        await prisma.$executeRaw`
          UPDATE TimeSlot 
          SET courtNumber = ${availableCourt}, updatedAt = datetime('now')
          WHERE id = ${slot.id}
        `;

        console.log(`   🎾 ✅ PISTA ${availableCourt} ASIGNADA`);
        updated++;
      } else {
        console.log(`   ⏭️ No se asigna pista (ninguna modalidad completa)`);
        skipped++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Proceso completado:`);
    console.log(`   - TimeSlots actualizados: ${updated}`);
    console.log(`   - TimeSlots omitidos: ${skipped}`);
    console.log(`   - Total revisados: ${slotsWithoutCourt.length}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el script
console.log('🚀 Iniciando corrección de asignación de pistas...\n');
fixCourtAssignments();
