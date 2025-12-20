const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function forceGenerate() {
  try {
    const clubId = 'padel-estrella-madrid';
    const instructorName = 'Carlos Rodríguez';
    
    // Buscar instructor Carlos
    const instructor = await prisma.instructor.findFirst({
      where: { 
        clubId,
        name: { contains: 'Carlos' }
      }
    });
    
    if (!instructor) {
      console.log('❌ Carlos no encontrado');
      return;
    }
    
    console.log(`👤 Instructor encontrado: ${instructor.name} (${instructor.id})`);
    
    // Generar propuestas para los próximos 7 días a las 9:00 y 9:30
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let day = 0; day < 7; day++) {
      const currentDate = new Date(today);
      currentDate.setDate(today.getDate() + day);
      
      // 9:00
      const start9am = new Date(currentDate);
      start9am.setHours(9, 0, 0, 0);
      
      const end9am = new Date(start9am);
      end9am.setHours(10, 0, 0, 0);
      
      // 9:30
      const start930 = new Date(currentDate);
      start930.setHours(9, 30, 0, 0);
      
      const end930 = new Date(start930);
      end930.setHours(10, 30, 0, 0);
      
      // Verificar si ya existe
      const existing9am = await prisma.timeSlot.findFirst({
        where: {
          instructorId: instructor.id,
          start: start9am
        }
      });
      
      const existing930 = await prisma.timeSlot.findFirst({
        where: {
          instructorId: instructor.id,
          start: start930
        }
      });
      
      // Crear 9:00 si no existe
      if (!existing9am) {
        await prisma.timeSlot.create({
          data: {
            clubId,
            instructorId: instructor.id,
            start: start9am,
            end: end9am,
            level: 'abierto',
            category: 'abierto',
            instructorPrice: 40,
            courtRentalPrice: 0,
            totalPrice: 40,
            maxPlayers: 4,
            creditsCost: 1
          }
        });
        console.log(`✅ Creada propuesta: ${start9am.toISOString()}`);
      }
      
      // Crear 9:30 si no existe
      if (!existing930) {
        await prisma.timeSlot.create({
          data: {
            clubId,
            instructorId: instructor.id,
            start: start930,
            end: end930,
            level: 'abierto',
            category: 'abierto',
            instructorPrice: 40,
            courtRentalPrice: 0,
            totalPrice: 40,
            maxPlayers: 4,
            creditsCost: 1
          }
        });
        console.log(`✅ Creada propuesta: ${start930.toISOString()}`);
      }
    }
    
    console.log('\n✅ Generación completada');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

forceGenerate();
