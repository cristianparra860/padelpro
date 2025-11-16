const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const schedules = await prisma.$queryRaw`
      SELECT * FROM InstructorSchedule LIMIT 20
    `;

    console.log(`\n📊 Total bloques: ${schedules.length}\n`);

    if (schedules.length > 0) {
      console.log('📋 Primeros 20 bloques:\n');
      schedules.forEach(s => {
        const start = new Date(s.startTime);
        const end = new Date(s.endTime);
        console.log(`  Instructor: ${s.instructorId?.substring(0, 20)}`);
        console.log(`  Inicio: ${start.toLocaleString('es-ES')}`);
        console.log(`  Fin: ${end.toLocaleString('es-ES')}`);
        console.log(`  Hora inicio: ${start.getHours()}:${start.getMinutes().toString().padStart(2, '0')}`);
        console.log(`  Ocupado: ${s.isOccupied}`);
        console.log('');
      });

      // Encontrar hora mínima
      const minHour = Math.min(...schedules.map(s => new Date(s.startTime).getHours()));
      console.log(`⏰ Hora más temprana con disponibilidad: ${minHour.toString().padStart(2, '0')}:00`);
    } else {
      console.log('❌ No hay bloques de horario');
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
})();
