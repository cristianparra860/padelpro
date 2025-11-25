const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function add7amClasses() {
  console.log('Agregando clases de 07:00 y 07:30 para días existentes...\n');
  
  const instructors = await prisma.instructor.findMany({
    where: { isActive: true },
    select: { id: true }
  });
  
  console.log(`Instructores: ${instructors.length}`);
  
  let created = 0;
  
  // Para cada día del 11 al 29 (29 nov - 17 dic)
  for (let dayOffset = 11; dayOffset < 30; dayOffset++) {
    const targetDate = new Date('2025-11-18');
    targetDate.setDate(targetDate.getDate() + dayOffset);
    const dateStr = targetDate.toISOString().split('T')[0];
    
    // Generar para 07:00 y 07:30
    for (const time of ['07:00', '07:30']) {
      const startDateTime = new Date(`${dateStr}T${time}:00.000Z`);
      const endDateTime = new Date(startDateTime);
      endDateTime.setHours(endDateTime.getHours() + 1);
      
      for (const instructor of instructors) {
        // Verificar si ya existe
        const existing = await prisma.timeSlot.findFirst({
          where: {
            clubId: 'padel-estrella-madrid',
            instructorId: instructor.id,
            start: startDateTime,
            courtId: null
          }
        });
        
        if (existing) continue;
        
        // Crear
        await prisma.timeSlot.create({
          data: {
            id: `ts_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            clubId: 'padel-estrella-madrid',
            instructorId: instructor.id,
            start: startDateTime,
            end: endDateTime,
            maxPlayers: 4,
            totalPrice: 25,
            instructorPrice: 15,
            courtRentalPrice: 10,
            level: 'ABIERTO',
            category: 'ABIERTO'
          }
        });
        
        created++;
      }
    }
  }
  
  console.log(`\nTotal clases creadas: ${created}`);
  await prisma.$disconnect();
}

add7amClasses();
