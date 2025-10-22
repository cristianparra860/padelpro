// Verificar qué está devolviendo el API
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAPIData() {
  console.log('🔍 Verificando datos del API...\n');

  try {
    // Simular la query del API
    const startDate = new Date('2025-09-30T22:00:00.000Z');
    const endDate = new Date('2025-10-31T22:59:59.999Z');

    const allClasses = await prisma.timeSlot.findMany({
      where: {
        start: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: {
        start: 'asc'
      }
    });

    console.log(`📊 Total clases en el rango: ${allClasses.length}`);

    // Separar por tipo
    const confirmed = allClasses.filter(c => c.courtId !== null);
    const proposed = allClasses.filter(c => c.courtId === null);

    console.log(`✅ Confirmadas: ${confirmed.length}`);
    console.log(`🟠 Propuestas: ${proposed.length}\n`);

    // Verificar propuestas del 21 de octubre
    const oct21Proposals = proposed.filter(p => {
      const d = new Date(p.start);
      return d.getDate() === 21 && d.getMonth() === 9; // Octubre = 9
    });

    console.log(`📅 Propuestas del 21 de octubre: ${oct21Proposals.length}\n`);

    // Mostrar las primeras 20 con sus minutos
    console.log('⏰ Primeras 20 propuestas del 21 de octubre:');
    oct21Proposals.slice(0, 20).forEach(p => {
      const d = new Date(p.start);
      const time = `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
      console.log(`   ${time} - Instructor: ${p.instructorId.substring(0,20)}...`);
    });

    // Contar por minutos
    const by00 = oct21Proposals.filter(p => new Date(p.start).getMinutes() === 0).length;
    const by30 = oct21Proposals.filter(p => new Date(p.start).getMinutes() === 30).length;

    console.log(`\n📊 Distribución:`);
    console.log(`   :00 -> ${by00} propuestas`);
    console.log(`   :30 -> ${by30} propuestas`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAPIData();
