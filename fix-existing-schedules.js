/**
 * Actualiza CourtSchedule e InstructorSchedule para clases ya confirmadas
 * Añade los bloques de 30 min faltantes (buffer + clase completa)
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixSchedules() {
  console.log('🔧 Actualizando schedules de clases confirmadas...\n');

  try {
    // 1. Obtener todas las clases confirmadas (con pista asignada)
    const confirmedClasses = await prisma.$queryRaw`
      SELECT id, start, end, courtId, courtNumber, instructorId
      FROM TimeSlot
      WHERE courtId IS NOT NULL
      AND courtNumber IS NOT NULL
    `;

    console.log(`📋 Encontradas ${confirmedClasses.length} clases confirmadas\n`);

    let updatedCourts = 0;
    let updatedInstructors = 0;

    for (const cls of confirmedClasses) {
      const startDate = new Date(Number(cls.start));
      const endDate = new Date(Number(cls.end));
      const dateStr = startDate.toISOString().split('T')[0];

      // Calcular los 3 bloques de 30 min
      const bufferStart = new Date(startDate.getTime() - 30 * 60 * 1000);
      const firstBlockEnd = new Date(startDate.getTime() + 30 * 60 * 1000);
      const secondBlockEnd = new Date(startDate.getTime() + 60 * 60 * 1000);

      const blocks = [
        { start: bufferStart.toISOString(), end: startDate.toISOString(), reason: 'Buffer pre-clase (30 min)' },
        { start: startDate.toISOString(), end: firstBlockEnd.toISOString(), reason: 'Clase confirmada (0-30 min)' },
        { start: firstBlockEnd.toISOString(), end: secondBlockEnd.toISOString(), reason: 'Clase confirmada (30-60 min)' }
      ];

      // Procesar CourtSchedule
      if (cls.courtId) {
        // Eliminar registros existentes para este timeslot
        await prisma.$executeRaw`
          DELETE FROM CourtSchedule
          WHERE timeSlotId = ${cls.id}
        `;

        // Crear los 3 bloques nuevos
        for (const block of blocks) {
          const courtScheduleId = `cs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          try {
            await prisma.$executeRaw`
              INSERT INTO CourtSchedule (
                id, courtId, date, startTime, endTime, 
                isOccupied, timeSlotId, reason, createdAt, updatedAt
              )
              VALUES (
                ${courtScheduleId},
                ${cls.courtId},
                ${dateStr},
                ${block.start},
                ${block.end},
                1,
                ${cls.id},
                ${block.reason},
                datetime('now'),
                datetime('now')
              )
            `;
            updatedCourts++;
          } catch (insertError) {
            console.log(`   ⚠️ Bloque ya existe: ${block.start} (pista ${cls.courtNumber})`);
          }
        }
      }

      // Procesar InstructorSchedule
      if (cls.instructorId) {
        // Eliminar registros existentes para este timeslot
        await prisma.$executeRaw`
          DELETE FROM InstructorSchedule
          WHERE timeSlotId = ${cls.id}
        `;

        // Crear los 3 bloques nuevos
        for (const block of blocks) {
          const instructorScheduleId = `is_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          try {
            await prisma.$executeRaw`
              INSERT INTO InstructorSchedule (
                id, instructorId, date, startTime, endTime,
                isOccupied, timeSlotId, reason, createdAt, updatedAt
              )
              VALUES (
                ${instructorScheduleId},
                ${cls.instructorId},
                ${dateStr},
                ${block.start},
                ${block.end},
                1,
                ${cls.id},
                ${block.reason},
                datetime('now'),
                datetime('now')
              )
            `;
            updatedInstructors++;
          } catch (insertError) {
            console.log(`   ⚠️ Bloque ya existe: ${block.start} (instructor)`);
          }
        }
      }
    }

    console.log(`\n✅ Actualización completada:`);
    console.log(`   📊 Bloques añadidos en CourtSchedule: ${updatedCourts}`);
    console.log(`   📊 Bloques añadidos en InstructorSchedule: ${updatedInstructors}`);
    console.log(`\n   Total: ${updatedCourts + updatedInstructors} bloques de 30 min creados`);

    // Verificación
    const totalCourtBlocks = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM CourtSchedule WHERE isOccupied = 1
    `;
    const totalInstructorBlocks = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM InstructorSchedule WHERE isOccupied = 1
    `;

    console.log(`\n📈 Estado final:`);
    console.log(`   CourtSchedule: ${totalCourtBlocks[0].count} bloques ocupados`);
    console.log(`   InstructorSchedule: ${totalInstructorBlocks[0].count} bloques ocupados`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixSchedules();
