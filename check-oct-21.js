// Verificar propuestas del 21 de octubre
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkOct21() {
  console.log('📅 Verificando propuestas del 21 de octubre de 2025\n');

  try {
    // Obtener todas las propuestas del 21 de octubre
    const proposals = await prisma.timeSlot.findMany({
      where: {
        start: {
          gte: new Date('2025-10-21T00:00:00.000Z'),
          lt: new Date('2025-10-22T00:00:00.000Z')
        },
        courtId: null  // Solo propuestas
      },
      orderBy: {
        start: 'asc'
      },
      take: 50  // Limitar a las primeras 50
    });

    console.log(`📊 Total propuestas encontradas: ${proposals.length}\n`);

    if (proposals.length === 0) {
      console.log('❌ NO HAY PROPUESTAS para el 21 de octubre!\n');
      return;
    }

    // Agrupar por instructor
    const byInstructor = {};
    proposals.forEach(p => {
      if (!byInstructor[p.instructorId]) {
        byInstructor[p.instructorId] = [];
      }
      byInstructor[p.instructorId].push(p);
    });

    console.log(`👥 Instructores con propuestas: ${Object.keys(byInstructor).length}\n`);

    for (const [instructorId, instructorProposals] of Object.entries(byInstructor)) {
      console.log(`\n📍 Instructor: ${instructorId}`);
      console.log(`   Total propuestas: ${instructorProposals.length}`);
      
      // Mostrar las primeras 10
      console.log(`   Horarios (primeras 10):`);
      instructorProposals.slice(0, 10).forEach(p => {
        const start = new Date(p.start);
        const end = new Date(p.end);
        console.log(`      - ${start.toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'})} - ${end.toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'})} (${p.category})`);
      });

      if (instructorProposals.length > 10) {
        console.log(`      ... y ${instructorProposals.length - 10} más`);
      }

      // Verificar si están cada 30 minutos
      const gaps = [];
      for (let i = 0; i < instructorProposals.length - 1; i++) {
        const current = new Date(instructorProposals[i].start);
        const next = new Date(instructorProposals[i + 1].start);
        const diff = (next - current) / (1000 * 60); // minutos
        if (diff !== 30) {
          gaps.push({
            from: current.toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'}),
            to: next.toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'}),
            diff: diff
          });
        }
      }

      if (gaps.length > 0) {
        console.log(`   ⚠️ Gaps encontrados (${gaps.length}):`);
        gaps.slice(0, 5).forEach(g => {
          console.log(`      - ${g.from} → ${g.to} (${g.diff} min)`);
        });
      } else {
        console.log(`   ✅ Propuestas cada 30 minutos correctamente`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkOct21();
