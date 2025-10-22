import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanAndRegenerate() {
  try {
    console.log('\n🧹 LIMPIEZA COMPLETA DE PROPUESTAS\n');
    
    // Eliminar TODAS las propuestas (courtId = null)
    console.log('1️⃣  Eliminando todas las propuestas...');
    const deleted = await prisma.timeSlot.deleteMany({
      where: { courtId: null }
    });
    console.log(`   ✅ Eliminadas: ${deleted.count} propuestas\n`);
    
    // Obtener instructores
    const instructors = await prisma.instructor.findMany({
      where: { clubId: 'club-1' }
    });
    
    console.log(`2️⃣  Instructores encontrados: ${instructors.length}`);
    instructors.forEach((inst, i) => {
      console.log(`   ${i + 1}. ${inst.id}`);
    });
    console.log('');
    
    // Generar para TODO OCTUBRE 2025 (del 1 al 31)
    console.log('3️⃣  Generando propuestas para OCTUBRE 2025...\n');
    
    const proposals = [];
    let count = 0;
    
    for (let day = 1; day <= 31; day++) {
      // Para cada hora de 08:00 a 21:00 (cada 30 min)
      for (let hour = 8; hour < 22; hour++) {
        for (let minute of [0, 30]) {
          if (hour === 21 && minute === 30) break;
          
          // Crear fechas en hora local de España
          // En octubre España está en CEST (UTC+2)
          const startDate = new Date(2025, 9, day, hour, minute, 0); // mes 9 = octubre
          const endDate = new Date(startDate.getTime() + 90 * 60 * 1000);
          
          // Una propuesta por instructor
          for (const instructor of instructors) {
            proposals.push({
              clubId: 'club-1',
              instructorId: instructor.id,
              courtId: null,
              start: startDate,
              end: endDate,
              maxPlayers: 4,
              totalPrice: 25.0,
              level: 'INTERMEDIATE',
              category: 'ADULTS'
            });
            count++;
          }
        }
      }
      
      if (day === 1 || day === 15 || day === 31) {
        console.log(`   Preparado día ${day}: ${count} propuestas acumuladas`);
      }
    }
    
    console.log(`\n4️⃣  Insertando ${proposals.length} propuestas en la base de datos...\n`);
    
    // Mostrar ejemplo
    console.log('📝 Ejemplo de las primeras 3 propuestas:');
    proposals.slice(0, 3).forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.start.toISOString()} - Instructor: ${p.instructorId}`);
    });
    console.log('');
    
    // Insertar en lotes de 100
    const batchSize = 100;
    let inserted = 0;
    
    for (let i = 0; i < proposals.length; i += batchSize) {
      const batch = proposals.slice(i, i + batchSize);
      await prisma.timeSlot.createMany({
        data: batch
      });
      inserted += batch.length;
      process.stdout.write(`\r   Progreso: ${inserted}/${proposals.length}`);
    }
    
    console.log('\n\n✅ COMPLETADO!\n');
    console.log('📊 Resumen:');
    console.log(`   Mes: Octubre 2025`);
    console.log(`   Días: 1-31`);
    console.log(`   Horarios: 08:00 - 21:00 (cada 30 min)`);
    console.log(`   Instructores: ${instructors.length}`);
    console.log(`   Total propuestas: ${proposals.length}`);
    console.log(`   Por día: ${proposals.length / 31}`);
    console.log(`   Por instructor: ${proposals.length / instructors.length}`);
    console.log('');
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('\n❌ Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

cleanAndRegenerate();
