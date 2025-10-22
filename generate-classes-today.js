const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function generateClassesToday() {
  console.log('\n🎯 Generando clases para HOY (2025-10-18)...\n');

  try {
    const clubId = 'club-1';
    const dateStr = '2025-10-18';

    // Verificar instructor
    const instructor = await prisma.$queryRaw`
      SELECT id FROM Instructor WHERE clubId = ${clubId} AND isActive = 1 LIMIT 1
    `;

    if (!instructor || instructor.length === 0) {
      console.log('❌ No hay instructores. Ejecutar: node seed-basic-data.js');
      return;
    }

    const instructorId = instructor[0].id;
    console.log(`✅ Instructor: ${instructorId}`);

    // Generar clases de 09:00 a 18:00 cada hora
    let created = 0;
    for (let hour = 9; hour <= 18; hour++) {
      const startTime = `${hour.toString().padStart(2, '0')}:00`;
      const endTime = `${(hour + 1).toString().padStart(2, '0')}:00`;
      
      const startDateTime = new Date(`${dateStr}T${startTime}:00.000Z`);
      const endDateTime = new Date(`${dateStr}T${endTime}:00.000Z`);

      // Verificar si existe
      const existing = await prisma.$queryRaw`
        SELECT id FROM TimeSlot 
        WHERE start = ${startDateTime.toISOString()}
        AND instructorId = ${instructorId}
      `;

      if (existing && existing.length > 0) {
        console.log(`⏭️  ${startTime}: Ya existe`);
        continue;
      }

      // Crear TimeSlot
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

      console.log(`✅ ${startTime}-${endTime}: Clase creada`);
      created++;
    }

    console.log(`\n✅ Total creadas: ${created} clases`);
    console.log('\n🔄 Recargar la página para verlas');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

generateClassesToday();
