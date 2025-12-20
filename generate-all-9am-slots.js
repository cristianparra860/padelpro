const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function generateAllNineAM() {
  try {
    const clubId = 'padel-estrella-madrid';
    
    // Obtener todos los instructores
    const instructors = await prisma.instructor.findMany({
      where: { clubId }
    });
    
    console.log(`👥 Generando clases 9:00-10:00 para ${instructors.length} instructores\n`);
    
    // Generar para los próximos 7 días
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let created = 0;
    let skipped = 0;
    
    for (const instructor of instructors) {
      console.log(`\n👤 ${instructor.name}:`);
      
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
        
        // Verificar si ya existen
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
        
        // Verificar si hay clase confirmada que bloquee
        const hasConfirmed9am = await prisma.timeSlot.findFirst({
          where: {
            instructorId: instructor.id,
            start: start9am,
            courtId: { not: null }
          }
        });
        
        // Crear 9:00 si no existe y no está confirmada
        if (!existing9am && !hasConfirmed9am) {
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
          console.log(`  ✅ ${start9am.toLocaleDateString()} 9:00`);
          created++;
        } else if (hasConfirmed9am) {
          console.log(`  ⏭️  ${start9am.toLocaleDateString()} 9:00 (confirmada, skip)`);
          skipped++;
        } else {
          skipped++;
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
          console.log(`  ✅ ${start930.toLocaleDateString()} 9:30`);
          created++;
        } else {
          skipped++;
        }
      }
    }
    
    console.log(`\n\n📊 Resumen:`);
    console.log(`  ✅ Clases creadas: ${created}`);
    console.log(`  ⏭️  Clases omitidas: ${skipped}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

generateAllNineAM();
