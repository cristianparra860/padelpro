const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCarlosClasses() {
  try {
    console.log('🔍 Verificando clases confirmadas de Carlos Martinez hoy...\n');

    const today = new Date('2025-11-08T00:00:00'); // Sábado 8 nov (en tu captura)
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const startTimestamp = startOfDay.getTime();
    const endTimestamp = endOfDay.getTime();

    // Obtener instructor Carlos
    const carlos = await prisma.instructor.findFirst({
      where: { 
        user: { 
          name: { contains: 'Carlos' }
        }
      }
    });

    if (!carlos) {
      console.log('❌ Carlos no encontrado');
      return;
    }

    console.log(`✅ Instructor Carlos: ${carlos.id}\n`);

    // Buscar clases confirmadas de Carlos hoy
    const confirmedClasses = await prisma.$queryRawUnsafe(`
      SELECT 
        t.id,
        t.start,
        t.end,
        t.courtId,
        c.number as courtNumber
      FROM TimeSlot t
      LEFT JOIN Court c ON t.courtId = c.id
      WHERE t.instructorId = ?
        AND t.start >= ?
        AND t.start <= ?
        AND t.courtId IS NOT NULL
      ORDER BY t.start
    `, carlos.id, startTimestamp, endTimestamp);

    console.log(`📊 Clases confirmadas de Carlos el 8/nov: ${confirmedClasses.length}\n`);

    confirmedClasses.forEach(cls => {
      const start = new Date(Number(cls.start));
      const end = new Date(Number(cls.end));
      const duration = (Number(cls.end) - Number(cls.start)) / (1000 * 60);
      
      console.log(`⏰ ${start.toLocaleTimeString('es-ES')} - ${end.toLocaleTimeString('es-ES')} (${duration} min)`);
      console.log(`   Pista: ${cls.courtNumber || 'N/A'}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCarlosClasses();
