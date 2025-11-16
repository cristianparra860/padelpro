const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const slots = await prisma.timeSlot.findMany({
      where: { 
        clubId: 'club-1',
        courtId: null 
      },
      orderBy: { start: 'asc' },
      take: 50
    });

    console.log(`\n📊 Total propuestas encontradas: ${slots.length}\n`);
    console.log('Primeras 50 propuestas por hora:\n');
    
    slots.forEach(s => {
      const d = new Date(s.start);
      const hour = d.getHours();
      const minute = d.getMinutes();
      console.log(`${d.toLocaleDateString('es-ES')} ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} - Instructor: ${s.instructorId?.substring(0, 15)}`);
    });

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
})();
