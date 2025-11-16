const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix8amTimezone() {
  try {
    console.log('🔧 CORRIGIENDO ZONA HORARIA DE SLOTS 8:00-8:30\n');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    // Obtener todos los instructores
    const instructors = await prisma.instructor.findMany({
      where: { isActive: true }
    });
    
    console.log(`👥 Instructores activos: ${instructors.length}\n`);
    
    let created = 0;
    
    // Para cada día de los próximos 7 días
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const currentDate = new Date(today);
      currentDate.setDate(today.getDate() + dayOffset);
      
      // Para cada instructor
      for (const instructor of instructors) {
        // SOLO crear slots de 8:00 y 8:30
        for (const hour of [8]) {
          for (const minute of [0, 30]) {
            // Crear fecha en hora LOCAL (España UTC+1)
            const slotStartLocal = new Date(currentDate);
            slotStartLocal.setHours(hour, minute, 0, 0);
            
            // Convertir manualmente a UTC restando 1 hora
            const slotStartUTC = new Date(slotStartLocal.getTime() - (60 * 60 * 1000));
            const slotEndUTC = new Date(slotStartUTC.getTime() + 60 * 60 * 1000);
            
            console.log(`Creando: ${slotStartLocal.toLocaleString('es-ES')} → ${slotStartUTC.toISOString()}`);
            
            // Verificar si ya existe
            const existing = await prisma.timeSlot.findFirst({
              where: {
                instructorId: instructor.id,
                start: slotStartUTC,
                courtNumber: null
              }
            });
            
            if (!existing) {
              try {
                await prisma.timeSlot.create({
                  data: {
                    clubId: instructor.clubId,
                    instructorId: instructor.id,
                    start: slotStartUTC,
                    end: slotEndUTC,
                    maxPlayers: 4,
                    totalPrice: 25.00,
                    instructorPrice: 10.00,
                    courtRentalPrice: 15.00,
                    level: 'ABIERTO',
                    category: 'clases'
                  }
                });
                
                created++;
                console.log(`  ✅ Creado`);
              } catch (error) {
                console.log(`  ⚠️ Error: ${error.message}`);
              }
            } else {
              console.log(`  ℹ️ Ya existe`);
            }
          }
        }
      }
    }
    
    console.log(`\n📊 RESUMEN:`);
    console.log(`  Slots 8:00-8:30 creados: ${created}`);
    
    // Verificar total
    const total = await prisma.timeSlot.count({
      where: {
        start: {
          gte: today,
          lt: nextWeek
        },
        courtNumber: null
      }
    });
    
    console.log(`  Total propuestas ahora: ${total}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fix8amTimezone();
