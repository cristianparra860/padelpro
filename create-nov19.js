const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createNov19Classes() {
  const clubId = 'padel-estrella-madrid';
  const date = '2025-11-19';
  
  // Obtener instructores
  const instructors = await prisma.$queryRaw`
    SELECT id FROM Instructor WHERE isActive = 1
  `;
  
  console.log(` Creando clases para ${instructors.length} instructores\n`);
  
  let created = 0;
  
  // Horarios de 06:00 a 20:30 UTC (cada 30 min)
  for (let hour = 6; hour < 21; hour++) {
    for (let minute of [0, 30]) {
      const hourStr = hour.toString().padStart(2, '0');
      const minStr = minute.toString().padStart(2, '0');
      const startTime = `${hourStr}:${minStr}`;
      
      const startDateTime = new Date(`${date}T${startTime}:00.000Z`);
      const endDateTime = new Date(startDateTime);
      endDateTime.setHours(endDateTime.getHours() + 1);
      
      for (const instructor of instructors) {
        // Verificar si ya existe
        const existing = await prisma.timeSlot.findFirst({
          where: {
            clubId,
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
            clubId,
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
  
  console.log(` Creadas ${created} clases para el día 19`);
  
  await prisma.$disconnect();
}

createNov19Classes();
