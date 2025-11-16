const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteAllAndRegenerate() {
  try {
    console.log('🗑️ ELIMINANDO TODAS LAS PROPUESTAS\n');
    
    // Eliminar TODAS las propuestas (courtId = null)
    const deleted = await prisma.$executeRaw`
      DELETE FROM TimeSlot
      WHERE courtId IS NULL
    `;
    
    console.log(`✅ Eliminadas ${deleted} propuestas\n`);
    
    console.log('🔄 REGENERANDO PROPUESTAS CON FECHAS UTC CORRECTAS\n');
    
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0); // UTC midnight
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    // Obtener todos los instructores activos
    const instructors = await prisma.instructor.findMany({
      where: { isActive: true }
    });
    
    console.log(`👥 Instructores activos: ${instructors.length}\n`);
    
    let created = 0;
    
    // Para cada día de los próximos 7 días
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const currentDate = new Date(today);
      currentDate.setUTCDate(today.getUTCDate() + dayOffset);
      
      // Para cada instructor
      for (const instructor of instructors) {
        // Para cada franja horaria (8:00-21:30 en hora local = 7:00-20:30 UTC para UTC+1)
        // Generar desde 7:00 UTC hasta 20:30 UTC (8:00-21:30 local)
        for (let hourUTC = 7; hourUTC < 21; hourUTC++) {
          for (const minute of [0, 30]) {
            const slotStart = new Date(currentDate);
            slotStart.setUTCHours(hourUTC, minute, 0, 0);
            const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);
            
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
              
              created++;
              if (created <= 3) {
                console.log(`  ✅ ${slotStart.toISOString()} → ${slotStart.toLocaleString('es-ES')}`);
              }
            } catch (error) {
              // Ignorar errores de duplicados
            }
          }
        }
      }
    }
    
    console.log(`\n📊 RESUMEN:`);
    console.log(`  Propuestas creadas: ${created}`);
    
    // Verificar total final
    const finalCount = await prisma.timeSlot.count({
      where: {
        start: {
          gte: today,
          lte: nextWeek
        }
      }
    });
    
    console.log(`  Total propuestas ahora: ${finalCount}`);
    
    // Verificar que hay slots de 8:00 AM local (7:00 UTC)
    const morning = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM TimeSlot
      WHERE start LIKE '%-13T07:%'
    `;
    
    console.log(`  Slots de 8:00 AM (7:00 UTC): ${morning[0].count}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteAllAndRegenerate();
