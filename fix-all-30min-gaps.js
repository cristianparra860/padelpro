const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixAll30MinGaps() {
  try {
    console.log('🔧 REPARANDO TODOS LOS HUECOS DE 30MIN\n');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    // Obtener todos los instructores activos
    const instructors = await prisma.instructor.findMany({
      where: { isActive: true }
    });
    
    console.log(`👥 Instructores activos: ${instructors.length}\n`);
    
    let totalCreated = 0;
    
    // Para cada instructor
    for (const instructor of instructors) {
      console.log(`\n📍 ${instructor.name || instructor.id}:`);
      
      // Para cada día de los próximos 7 días
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const currentDate = new Date(today);
        currentDate.setDate(today.getDate() + dayOffset);
        
        const dayStart = new Date(currentDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(currentDate);
        dayEnd.setHours(23, 59, 59, 999);
        
        // Obtener propuestas existentes de este instructor para este día
        const existingSlots = await prisma.timeSlot.findMany({
          where: {
            instructorId: instructor.id,
            start: {
              gte: dayStart,
              lte: dayEnd
            },
            courtNumber: null
          },
          select: {
            start: true
          }
        });
        
        const existingTimes = new Set(
          existingSlots.map(s => new Date(s.start).getTime())
        );
        
        // Verificar qué slots faltan (8:00-21:30 cada 30min)
        let dayCreated = 0;
        
        for (let hour = 8; hour < 22; hour++) {
          for (const minute of [0, 30]) {
            const slotStart = new Date(currentDate);
            slotStart.setHours(hour, minute, 0, 0);
            const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);
            
            // Si no existe, crearla
            if (!existingTimes.has(slotStart.getTime())) {
              try {
                await prisma.timeSlot.create({
                  data: {
                    clubId: instructor.clubId,
                    instructorId: instructor.id,
                    start: slotStart,
                    end: slotEnd,
                    maxPlayers: 4,
                    totalPrice: 25.00,
                    instructorPrice: 10.00,
                    courtRentalPrice: 15.00,
                    level: 'ABIERTO',
                    category: 'clases'
                  }
                });
                
                dayCreated++;
                totalCreated++;
              } catch (error) {
                // Ignorar errores de duplicados
              }
            }
          }
        }
        
        if (dayCreated > 0) {
          const dateStr = currentDate.toLocaleDateString('es-ES');
          console.log(`  ${dateStr}: ${dayCreated} propuestas creadas`);
        }
      }
    }
    
    console.log(`\n\n📊 RESUMEN:`);
    console.log(`  Total propuestas creadas: ${totalCreated}`);
    
    // Verificar total final
    const finalCount = await prisma.timeSlot.count({
      where: {
        start: {
          gte: today,
          lt: nextWeek
        },
        courtNumber: null
      }
    });
    
    console.log(`  Total propuestas disponibles ahora: ${finalCount}`);
    console.log(`\n✅ Todos los huecos de 30min reparados`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAll30MinGaps();
