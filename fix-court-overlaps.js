// Script para corregir solapamientos de pistas en clases confirmadas
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixCourtOverlaps() {
  console.log('🔧 Iniciando corrección de solapamientos de pistas...\n');

  try {
    // 1. Obtener todas las clases confirmadas (con courtNumber asignado)
    const confirmedClasses = await prisma.$queryRaw`
      SELECT id, start, end, courtNumber, instructorId, clubId
      FROM TimeSlot
      WHERE courtNumber IS NOT NULL
      ORDER BY start ASC, courtNumber ASC
    `;

    console.log(`📊 Total clases confirmadas: ${confirmedClasses.length}\n`);

    // 2. Agrupar por horario y buscar duplicados
    const overlaps = new Map(); // key: "start_courtNumber", value: [ids]

    for (const cls of confirmedClasses) {
      const key = `${cls.start}_${cls.courtNumber}`;
      if (!overlaps.has(key)) {
        overlaps.set(key, []);
      }
      overlaps.set(key, [...overlaps.get(key), cls]);
    }

    // 3. Encontrar los solapamientos (más de 1 clase en misma pista y hora)
    let overlapCount = 0;
    const overlappingClasses = [];

    for (const [key, classes] of overlaps.entries()) {
      if (classes.length > 1) {
        overlapCount++;
        console.log(`⚠️  Solapamiento ${overlapCount}:`);
        console.log(`   📅 Horario: ${classes[0].start}`);
        console.log(`   🏟️  Pista: ${classes[0].courtNumber}`);
        console.log(`   📚 ${classes.length} clases en el mismo horario:`);
        
        for (const cls of classes) {
          const bookings = await prisma.$queryRaw`
            SELECT COUNT(*) as count FROM Booking 
            WHERE timeSlotId = ${cls.id} 
            AND status IN ('PENDING', 'CONFIRMED')
          `;
          const bookingCount = bookings[0].count;
          console.log(`      - ID: ${cls.id} | Reservas: ${bookingCount}`);
        }

        overlappingClasses.push(classes);
      }
    }

    if (overlapCount === 0) {
      console.log('✅ No se encontraron solapamientos!\n');
      return;
    }

    console.log(`\n🔧 Total de solapamientos encontrados: ${overlapCount}\n`);
    console.log('🔄 Reasignando pistas...\n');

    // 4. Reasignar pistas a las clases solapadas
    let fixed = 0;

    for (const classes of overlappingClasses) {
      // Mantener la primera clase con su pista actual
      const [keepClass, ...reassignClasses] = classes;
      console.log(`   ✅ Manteniendo ${keepClass.id} en pista ${keepClass.courtNumber}`);

      // Reasignar las demás clases
      for (const cls of reassignClasses) {
        // Buscar pistas ocupadas en este horario
        const occupiedCourts = await prisma.$queryRaw`
          SELECT courtNumber FROM TimeSlot 
          WHERE clubId = ${cls.clubId}
          AND start = ${cls.start}
          AND courtNumber IS NOT NULL
          GROUP BY courtNumber
        `;

        const occupiedNumbers = occupiedCourts.map(c => c.courtNumber);

        // Obtener todas las pistas del club
        const clubCourts = await prisma.$queryRaw`
          SELECT number FROM Court 
          WHERE clubId = ${cls.clubId}
          AND isActive = 1
          ORDER BY number ASC
        `;

        // Encontrar primera pista disponible
        let newCourtNumber = null;
        for (const court of clubCourts) {
          if (!occupiedNumbers.includes(court.number)) {
            newCourtNumber = court.number;
            break;
          }
        }

        if (newCourtNumber) {
          // Actualizar la clase con la nueva pista
          await prisma.$executeRaw`
            UPDATE TimeSlot 
            SET courtNumber = ${newCourtNumber}, updatedAt = datetime('now')
            WHERE id = ${cls.id}
          `;
          console.log(`   🔄 Reasignada ${cls.id}: pista ${cls.courtNumber} → pista ${newCourtNumber}`);
          fixed++;
        } else {
          // Si no hay pistas disponibles, quitar la asignación de pista
          await prisma.$executeRaw`
            UPDATE TimeSlot 
            SET courtNumber = NULL, updatedAt = datetime('now')
            WHERE id = ${cls.id}
          `;
          console.log(`   ⚠️  ${cls.id}: Sin pistas disponibles, movida a propuestas`);
          fixed++;
        }
      }
    }

    console.log(`\n✅ Corrección completada!`);
    console.log(`   📊 Solapamientos corregidos: ${fixed}`);
    console.log(`   ✅ Las clases ahora tienen pistas únicas\n`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
fixCourtOverlaps();
