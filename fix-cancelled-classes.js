// Script para liberar clases confirmadas que no tienen reservas activas
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixCancelledClasses() {
  try {
    console.log('🔧 Buscando clases confirmadas sin reservas activas...\n');

    // Obtener todas las clases confirmadas (con pista asignada)
    const confirmedClasses = await prisma.$queryRaw`
      SELECT id, start, courtNumber, instructorId
      FROM TimeSlot
      WHERE courtNumber IS NOT NULL
    `;

    console.log(`📊 Encontradas ${confirmedClasses.length} clases confirmadas\n`);

    let freedClasses = 0;

    for (const timeSlot of confirmedClasses) {
      // Verificar si tiene reservas activas
      const activeBookings = await prisma.$queryRaw`
        SELECT COUNT(*) as count FROM Booking
        WHERE timeSlotId = ${timeSlot.id}
        AND status IN ('PENDING', 'CONFIRMED')
      `;

      const hasActiveBookings = activeBookings[0]?.count > 0;

      if (!hasActiveBookings) {
        console.log(`🔓 Liberando clase ${timeSlot.id}`);
        console.log(`   Fecha: ${new Date(timeSlot.start).toLocaleString('es-ES')}`);
        console.log(`   Pista: ${timeSlot.courtNumber}`);

        // Liberar la clase
        await prisma.$executeRaw`
          UPDATE TimeSlot
          SET courtId = NULL, courtNumber = NULL, updatedAt = datetime('now')
          WHERE id = ${timeSlot.id}
        `;

        // Liberar schedules
        await prisma.$executeRaw`
          DELETE FROM CourtSchedule WHERE timeSlotId = ${timeSlot.id}
        `;

        await prisma.$executeRaw`
          DELETE FROM InstructorSchedule WHERE timeSlotId = ${timeSlot.id}
        `;

        freedClasses++;
        console.log(`   ✅ Clase liberada\n`);
      }
    }

    console.log(`\n📊 Resumen:`);
    console.log(`   Total clases confirmadas: ${confirmedClasses.length}`);
    console.log(`   Clases liberadas: ${freedClasses}`);
    console.log(`   Clases con reservas activas: ${confirmedClasses.length - freedClasses}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixCancelledClasses();
