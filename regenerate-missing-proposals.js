const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function regenerateMissingProposals() {
  try {
    console.log('🔍 BUSCANDO HUECOS EN LAS PROPUESTAS\n');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    // Obtener todos los instructores activos
    const instructors = await prisma.instructor.findMany({
      where: { isActive: true }
    });
    
    console.log('👥 Instructores activos:', instructors.length);
    
    // Obtener todas las propuestas existentes
    const existingProposals = await prisma.timeSlot.findMany({
      where: {
        start: {
          gte: today,
          lte: nextWeek
        }
      },
      select: {
        start: true,
        instructorId: true
      }
    });
    
    console.log('📋 Propuestas existentes:', existingProposals.length);
    
    // Crear un Set con las claves existentes
    const existingKeys = new Set(
      existingProposals.map(p => `${p.instructorId}-${new Date(p.start).toISOString()}`)
    );
    
    console.log('\n🔄 Verificando huecos...\n');
    
    let created = 0;
    let skipped = 0;
    
    // Para cada día de los próximos 7 días
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const currentDate = new Date(today);
      currentDate.setDate(today.getDate() + dayOffset);
      
      // Para cada instructor
      for (const instructor of instructors) {
        // Para cada franja horaria (8:00-22:00 en intervalos de 30 min)
        for (let hour = 8; hour < 22; hour++) {
          for (const minute of [0, 30]) {
            const slotStart = new Date(currentDate);
            slotStart.setHours(hour, minute, 0, 0);
            const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);
            
            const key = `${instructor.id}-${slotStart.toISOString()}`;
            
            // Si no existe esta propuesta, crearla
            if (!existingKeys.has(key)) {
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
                if (created <= 5) {
                  console.log(`  ✅ Creada: ${slotStart.toLocaleString('es-ES')} - Instructor ${instructor.id.substring(0, 10)}...`);
                }
              } catch (error) {
                // Ignorar errores de duplicados
              }
            } else {
              skipped++;
            }
          }
        }
      }
    }
    
    console.log(`\n📊 RESUMEN:`);
    console.log(`  Propuestas creadas: ${created}`);
    console.log(`  Propuestas existentes (saltadas): ${skipped}`);
    
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
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

regenerateMissingProposals();
