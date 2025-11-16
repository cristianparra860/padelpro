// Script para verificar el estado real del calendario en la base de datos
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyCalendarState() {
  try {
    console.log('📊 Verificando estado real del calendario...\n');

    // Fecha: 24 de octubre de 2025 (la que se ve en tu captura)
    const date = '2025-10-24';
    const startOfDay = new Date(date + 'T00:00:00').getTime();
    const endOfDay = new Date(date + 'T23:59:59').getTime();

    console.log(`📅 Fecha: ${date}\n`);

    // 1. Clases confirmadas (verdes)
    const confirmed = await prisma.$queryRaw`
      SELECT id, start, end, instructorId, courtNumber
      FROM TimeSlot
      WHERE courtNumber IS NOT NULL
      AND start >= ${startOfDay}
      AND start <= ${endOfDay}
      ORDER BY courtNumber, start ASC
    `;

    console.log(`🟢 CLASES CONFIRMADAS (VERDES): ${confirmed.length}`);
    confirmed.forEach(c => {
      const time = new Date(c.start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      const endTime = new Date(c.end).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      console.log(`   Pista ${c.courtNumber}: ${time}-${endTime} (${c.instructorId})`);
    });

    // 2. Propuestas (naranjas)
    const proposals = await prisma.$queryRaw`
      SELECT id, start, end, instructorId
      FROM TimeSlot
      WHERE courtId IS NULL
      AND start >= ${startOfDay}
      AND start <= ${endOfDay}
      ORDER BY instructorId, start ASC
    `;

    console.log(`\n🟠 PROPUESTAS (NARANJAS): ${proposals.length}`);
    
    // Agrupar por instructor
    const byInstructor = {};
    proposals.forEach(p => {
      if (!byInstructor[p.instructorId]) {
        byInstructor[p.instructorId] = [];
      }
      byInstructor[p.instructorId].push(p);
    });

    for (const [instructor, slots] of Object.entries(byInstructor)) {
      console.log(`\n   ${instructor}: ${slots.length} propuestas`);
      slots.slice(0, 5).forEach(s => {
        const time = new Date(s.start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        console.log(`      ${time}`);
      });
      if (slots.length > 5) {
        console.log(`      ... y ${slots.length - 5} más`);
      }
    }

    // 3. Verificar solapamientos
    console.log(`\n\n🔍 VERIFICANDO SOLAPAMIENTOS...`);
    
    let overlaps = 0;
    for (const conf of confirmed) {
      const confStart = new Date(conf.start).getTime();
      const confEnd = new Date(conf.end).getTime();
      
      const overlapping = proposals.filter(p => 
        p.instructorId === conf.instructorId &&
        new Date(p.start).getTime() >= confStart &&
        new Date(p.start).getTime() < confEnd
      );
      
      if (overlapping.length > 0) {
        overlaps += overlapping.length;
        const confTime = new Date(conf.start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        console.log(`   ❌ Clase confirmada ${confTime} en Pista ${conf.courtNumber} tiene ${overlapping.length} propuesta(s) solapada(s)`);
        overlapping.forEach(o => {
          const pTime = new Date(o.start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
          console.log(`      - Propuesta a las ${pTime}`);
        });
      }
    }

    if (overlaps === 0) {
      console.log(`   ✅ No hay solapamientos! El calendario está correcto.`);
    } else {
      console.log(`\n   ⚠️  Total de solapamientos: ${overlaps}`);
    }

    console.log(`\n📈 RESUMEN GLOBAL:`);
    const totalProposals = await prisma.$queryRaw`SELECT COUNT(*) as count FROM TimeSlot WHERE courtId IS NULL`;
    const totalConfirmed = await prisma.$queryRaw`SELECT COUNT(*) as count FROM TimeSlot WHERE courtNumber IS NOT NULL`;
    console.log(`   🟠 Total propuestas: ${totalProposals[0].count}`);
    console.log(`   🟢 Total confirmadas: ${totalConfirmed[0].count}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyCalendarState();
