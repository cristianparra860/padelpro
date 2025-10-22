// Verificar qué clases hay el 22 de octubre de 2025
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkOctober22() {
  console.log('📅 Verificando clases del 22 de octubre de 2025\n');

  try {
    // Obtener todas las clases del 22 de octubre
    const classes = await prisma.timeSlot.findMany({
      where: {
        start: {
          gte: new Date('2025-10-22T00:00:00.000Z'),
          lt: new Date('2025-10-23T00:00:00.000Z')
        }
      },
      orderBy: {
        start: 'asc'
      }
    });

    console.log(`📊 Total clases encontradas: ${classes.length}\n`);

    // Separar por tipo
    const confirmed = classes.filter(c => c.courtNumber !== null);
    const proposed = classes.filter(c => c.courtNumber === null);

    console.log(`✅ Clases CONFIRMADAS (con pista asignada): ${confirmed.length}`);
    confirmed.forEach(c => {
      const start = new Date(c.start);
      const end = new Date(c.end);
      console.log(`   - ${start.toLocaleTimeString()} - ${end.toLocaleTimeString()}: Pista ${c.courtNumber}, Instructor: ${c.instructorId}`);
    });

    console.log(`\n🟠 Clases PROPUESTAS (sin pista): ${proposed.length}`);
    
    // Agrupar propuestas por instructor
    const byInstructor = {};
    proposed.forEach(p => {
      if (!byInstructor[p.instructorId]) {
        byInstructor[p.instructorId] = [];
      }
      byInstructor[p.instructorId].push(p);
    });

    for (const [instructorId, proposals] of Object.entries(byInstructor)) {
      console.log(`\n   📍 Instructor: ${instructorId} (${proposals.length} propuestas)`);
      proposals.slice(0, 10).forEach(p => {
        const start = new Date(p.start);
        const end = new Date(p.end);
        console.log(`      - ${start.toLocaleTimeString()} - ${end.toLocaleTimeString()}`);
      });
      if (proposals.length > 10) {
        console.log(`      ... y ${proposals.length - 10} más`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkOctober22();
