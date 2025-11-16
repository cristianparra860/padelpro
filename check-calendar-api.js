const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCalendarAPI() {
  try {
    console.log('🔍 Simulando API del calendario para Nov 19, 2025...\n');

    const clubId = 'padel-estrella-madrid';
    const date = new Date('2025-11-19T00:00:00.000Z');
    
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const startTimestamp = startOfDay.getTime();
    const endTimestamp = endOfDay.getTime();

    console.log('📅 Fecha:', date.toLocaleDateString('es-ES'));
    console.log('📌 Club:', clubId);
    console.log('⏰ Rango:', startOfDay.toLocaleString(), '-', endOfDay.toLocaleString());
    console.log('');

    // Consulta EXACTA de la API (src/app/api/admin/calendar/route.ts)
    const confirmedClasses = await prisma.$queryRawUnsafe(`
      SELECT 
        t.id,
        t.start,
        t.end,
        t.instructorId,
        t.level,
        t.genderCategory,
        t.courtId,
        c.number as courtNumber
      FROM TimeSlot t
      LEFT JOIN Court c ON t.courtId = c.id
      WHERE t.clubId = ?
        AND t.start >= ?
        AND t.start <= ?
        AND t.courtId IS NOT NULL
    `, clubId, startTimestamp, endTimestamp);

    console.log(`✅ Clases confirmadas (API): ${confirmedClasses.length}\n`);
    
    for (const cls of confirmedClasses) {
      const startDate = new Date(Number(cls.start));
      const endDate = new Date(Number(cls.end));
      const durationMin = (Number(cls.end) - Number(cls.start)) / (1000 * 60);
      
      console.log(`📅 Clase ID: ${cls.id}`);
      console.log(`   Inicio: ${startDate.toLocaleString('es-ES')}`);
      console.log(`   Fin: ${endDate.toLocaleString('es-ES')}`);
      console.log(`   Duración: ${durationMin} minutos`);
      console.log(`   Pista: ${cls.courtNumber || 'N/A'} (${cls.courtId})`);
      console.log(`   Instructor: ${cls.instructorId}`);
      console.log(`   Nivel: ${cls.level}`);
      console.log(`   Género: ${cls.genderCategory || 'N/A'}`);
      
      if (durationMin !== 60) {
        console.log(`   ⚠️  ATENCIÓN: Duración NO es 60 minutos!`);
      }
      console.log('');
    }

    // Propuestas
    const proposals = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*) as count
      FROM TimeSlot
      WHERE clubId = ?
        AND start >= ?
        AND start <= ?
        AND courtId IS NULL
    `, clubId, startTimestamp, endTimestamp);

    console.log(`📋 Propuestas disponibles: ${proposals[0].count}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCalendarAPI();
