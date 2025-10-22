const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * 🤖 GENERADOR AUTOMÁTICO DE TARJETAS DE CLASES
 * 
 * Este sistema genera propuestas de clases cada 30 minutos verificando:
 * 1. Disponibilidad de al menos 1 pista libre
 * 2. Disponibilidad de al menos 1 instructor libre
 * 
 * Si NO hay disponibilidad en ambos, NO se genera la tarjeta (propuesta).
 */

// Función para verificar disponibilidad
async function checkAvailability(date, startTime, endTime) {
  const startDateTime = new Date(`${date}T${startTime}:00.000Z`);
  const endDateTime = new Date(`${date}T${endTime}:00.000Z`);
  
  // 1. Verificar si hay alguna pista libre
  const occupiedCourts = await prisma.$queryRaw`
    SELECT DISTINCT courtId 
    FROM CourtSchedule
    WHERE date = ${date}
    AND isOccupied = 1
    AND (
      (startTime <= ${startDateTime.toISOString()} AND endTime > ${startDateTime.toISOString()})
      OR (startTime < ${endDateTime.toISOString()} AND endTime >= ${endDateTime.toISOString()})
      OR (startTime >= ${startDateTime.toISOString()} AND endTime <= ${endDateTime.toISOString()})
    )
  `;

  const totalCourts = await prisma.$queryRaw`SELECT COUNT(*) as count FROM Court`;
  const availableCourts = Number(totalCourts[0].count) - occupiedCourts.length;

  // 2. Verificar si hay algún instructor libre
  const occupiedInstructors = await prisma.$queryRaw`
    SELECT DISTINCT instructorId 
    FROM InstructorSchedule
    WHERE date = ${date}
    AND isOccupied = 1
    AND (
      (startTime <= ${startDateTime.toISOString()} AND endTime > ${startDateTime.toISOString()})
      OR (startTime < ${endDateTime.toISOString()} AND endTime >= ${endDateTime.toISOString()})
      OR (startTime >= ${startDateTime.toISOString()} AND endTime <= ${endDateTime.toISOString()})
    )
  `;

  const totalInstructors = await prisma.$queryRaw`SELECT COUNT(*) as count FROM Instructor WHERE isActive = 1`;
  const availableInstructors = Number(totalInstructors[0].count) - occupiedInstructors.length;

  console.log(`      Pistas: ${availableCourts}/${totalCourts[0].count} libres`);
  console.log(`      Instructores: ${availableInstructors}/${totalInstructors[0].count} libres`);

  return {
    hasAvailability: availableCourts > 0 && availableInstructors > 0,
    availableCourts,
    availableInstructors
  };
}

// Función para generar tarjetas para un día específico
async function generateCardsForDay(date) {
  console.log(`\n📅 Generando tarjetas para ${date}...\n`);

  const clubId = 'club-1';
  let createdCount = 0;
  let skippedCount = 0;

  // Obtener instructor Carlos (el instructor profesional)
  const instructor = await prisma.$queryRaw`
    SELECT id FROM Instructor WHERE id = 'instructor-carlos' AND isActive = 1 LIMIT 1
  `;

  if (!instructor || instructor.length === 0) {
    console.log('❌ Instructor Carlos no disponible');
    return { created: 0, skipped: 0 };
  }

  const instructorId = instructor[0].id;

  // Generar propuestas cada 30 minutos de 09:00 a 18:00
  const timeSlots = [];
  for (let hour = 9; hour < 18; hour++) {
    timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
    timeSlots.push(`${hour.toString().padStart(2, '0')}:30`);
  }

  for (const startTime of timeSlots) {
    const [hour, minute] = startTime.split(':').map(Number);
    const endHour = minute === 30 ? hour + 1 : hour;
    const endMinute = minute === 30 ? 30 : 0;
    const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;

    console.log(`   ⏰ ${startTime}-${endTime}:`);

    // Verificar disponibilidad
    const availability = await checkAvailability(date, startTime, endTime);

    if (!availability.hasAvailability) {
      console.log(`      ❌ Sin disponibilidad - NO se crea tarjeta`);
      skippedCount++;
      continue;
    }

    // Verificar si ya existe una tarjeta para este horario
    const startDateTime = new Date(`${date}T${startTime}:00.000Z`);
    const existing = await prisma.$queryRaw`
      SELECT id FROM TimeSlot 
      WHERE clubId = ${clubId}
      AND start = ${startDateTime.toISOString()}
      AND courtNumber IS NULL
    `;

    if (existing && existing.length > 0) {
      console.log(`      ⏭️  Ya existe - Skip`);
      skippedCount++;
      continue;
    }

    // CREAR TARJETA (propuesta de clase)
    const endDateTime = new Date(`${date}T${endTime}:00.000Z`);
    const timeSlotId = `ts_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await prisma.$executeRaw`
      INSERT INTO TimeSlot (
        id, clubId, instructorId, start, end,
        maxPlayers, totalPrice, level, category, createdAt, updatedAt
      )
      VALUES (
        ${timeSlotId},
        ${clubId},
        ${instructorId},
        ${startDateTime.toISOString()},
        ${endDateTime.toISOString()},
        4,
        25.0,
        'ABIERTO',
        'ABIERTO',
        datetime('now'),
        datetime('now')
      )
    `;

    console.log(`      ✅ Tarjeta creada (ID: ${timeSlotId})`);
    createdCount++;
  }

  return { created: createdCount, skipped: skippedCount };
}

// Función principal
async function autoGenerateCards() {
  console.log('\n🤖 GENERADOR AUTOMÁTICO DE TARJETAS DE CLASES\n');
  console.log('=' .repeat(50));

  try {
    // Generar para los próximos 7 días
    const today = new Date();
    let totalCreated = 0;
    let totalSkipped = 0;

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + dayOffset);
      const dateStr = targetDate.toISOString().split('T')[0];

      const result = await generateCardsForDay(dateStr);
      totalCreated += result.created;
      totalSkipped += result.skipped;
    }

    console.log('\n' + '='.repeat(50));
    console.log('\n📊 RESUMEN:');
    console.log(`   ✅ Tarjetas creadas: ${totalCreated}`);
    console.log(`   ⏭️  Saltadas (sin disponibilidad o duplicadas): ${totalSkipped}`);
    console.log(`\n✅ Proceso completado`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  autoGenerateCards();
}

module.exports = { autoGenerateCards, checkAvailability };
