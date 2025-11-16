// Ajustar todas las clases confirmadas existentes a 60 minutos de duración
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixConfirmedClassesDuration() {
  try {
    console.log('🔍 Buscando clases confirmadas con duración != 60 minutos...\n');
    
    // Obtener todas las clases confirmadas
    const confirmedClasses = await prisma.timeSlot.findMany({
      where: {
        courtId: { not: null }
      },
      include: {
        court: true
      },
      orderBy: {
        start: 'asc'
      }
    });
    
    console.log(`📊 Total clases confirmadas: ${confirmedClasses.length}\n`);
    
    let fixed = 0;
    let alreadyCorrect = 0;
    
    for (const classItem of confirmedClasses) {
      const start = new Date(classItem.start);
      const end = new Date(classItem.end);
      const durationMinutes = (end - start) / 1000 / 60;
      
      if (durationMinutes !== 60) {
        const newEnd = new Date(start);
        newEnd.setMinutes(start.getMinutes() + 60);
        
        console.log(`⚙️  Ajustando clase ${classItem.id}:`);
        console.log(`   Pista: ${classItem.court?.number || 'N/A'}`);
        console.log(`   Inicio: ${start.toISOString()}`);
        console.log(`   Fin anterior: ${end.toISOString()} (${durationMinutes} min)`);
        console.log(`   Fin nuevo: ${newEnd.toISOString()} (60 min)`);
        
        // Actualizar la clase
        await prisma.timeSlot.update({
          where: { id: classItem.id },
          data: { end: newEnd }
        });
        
        // También actualizar los schedules relacionados si existen
        if (classItem.courtId) {
          await prisma.$executeRaw`
            UPDATE CourtSchedule 
            SET endTime = ${newEnd.toISOString()}
            WHERE courtId = ${classItem.courtId}
            AND startTime = ${start.toISOString()}
            AND isOccupied = 1
          `;
        }
        
        if (classItem.instructorId) {
          await prisma.$executeRaw`
            UPDATE InstructorSchedule 
            SET endTime = ${newEnd.toISOString()}
            WHERE instructorId = ${classItem.instructorId}
            AND startTime = ${start.toISOString()}
            AND isOccupied = 1
          `;
        }
        
        fixed++;
        console.log(`   ✅ Actualizada\n`);
      } else {
        alreadyCorrect++;
      }
    }
    
    console.log('\n📈 RESUMEN:');
    console.log(`   ✅ Clases ajustadas: ${fixed}`);
    console.log(`   ✓  Ya correctas: ${alreadyCorrect}`);
    console.log(`   📊 Total: ${confirmedClasses.length}`);
    
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

fixConfirmedClassesDuration();
