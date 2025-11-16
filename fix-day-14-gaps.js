const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDay14Gaps() {
  try {
    console.log('🔍 VERIFICANDO HUECOS DEL DÍA 14 DE NOVIEMBRE\n');
    
    // Día 14 completo
    const day14Start = new Date('2025-11-14T00:00:00');
    const day14End = new Date('2025-11-15T00:00:00');
    
    // Obtener todos los instructores
    const instructors = await prisma.instructor.findMany({
      where: { isActive: true }
    });
    
    console.log(`👥 Instructores activos: ${instructors.length}\n`);
    
    let totalGaps = 0;
    
    for (const instructor of instructors) {
      // Obtener slots existentes
      const slots = await prisma.timeSlot.findMany({
        where: {
          instructorId: instructor.id,
          start: {
            gte: day14Start,
            lt: day14End
          },
          courtNumber: null
        },
        select: {
          start: true
        },
        orderBy: {
          start: 'asc'
        }
      });
      
      // Horarios esperados (8:00-21:30 cada 30min = 28 slots)
      const expectedTimes = [];
      for (let hour = 8; hour < 22; hour++) {
        for (const minute of [0, 30]) {
          const time = new Date(day14Start);
          time.setHours(hour, minute, 0, 0);
          expectedTimes.push(time.getTime());
        }
      }
      
      const existingTimes = new Set(slots.map(s => new Date(s.start).getTime()));
      const missingTimes = expectedTimes.filter(t => !existingTimes.has(t));
      
      if (missingTimes.length > 0) {
        console.log(`❌ ${instructor.name || instructor.id}:`);
        console.log(`   Slots existentes: ${slots.length}/28`);
        console.log(`   FALTAN ${missingTimes.length} slots:\n`);
        
        missingTimes.forEach(t => {
          const d = new Date(t);
          console.log(`      ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`);
        });
        
        console.log('');
        totalGaps += missingTimes.length;
      } else {
        console.log(`✅ ${instructor.name || instructor.id}: Completo (28 slots)`);
      }
    }
    
    console.log(`\n📊 RESUMEN:`);
    console.log(`   Total huecos encontrados: ${totalGaps}`);
    
    if (totalGaps > 0) {
      console.log(`\n🔧 Regenerando ${totalGaps} slots faltantes...\n`);
      
      let created = 0;
      
      for (const instructor of instructors) {
        const slots = await prisma.timeSlot.findMany({
          where: {
            instructorId: instructor.id,
            start: {
              gte: day14Start,
              lt: day14End
            },
            courtNumber: null
          },
          select: { start: true }
        });
        
        const existingTimes = new Set(slots.map(s => new Date(s.start).getTime()));
        
        for (let hour = 8; hour < 22; hour++) {
          for (const minute of [0, 30]) {
            const slotStart = new Date(day14Start);
            slotStart.setHours(hour, minute, 0, 0);
            const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);
            
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
                
                created++;
                console.log(`   ✅ ${slotStart.toLocaleTimeString('es-ES')} - ${instructor.name}`);
              } catch (error) {
                // Ignorar duplicados
              }
            }
          }
        }
      }
      
      console.log(`\n✅ ${created} slots creados para el día 14`);
    } else {
      console.log(`\n✅ No hay huecos - todos los slots están activos`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDay14Gaps();
