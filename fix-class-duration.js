const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixClassDurations() {
  try {
    console.log('🔍 Verificando y corrigiendo duraciones de clases...\n');

    // Obtener TODAS las clases (confirmadas y propuestas)
    const allSlots = await prisma.$queryRaw`
      SELECT 
        id,
        datetime(start / 1000, 'unixepoch', 'localtime') as startTime,
        datetime(end / 1000, 'unixepoch', 'localtime') as endTime,
        CAST((end - start) / (1000 * 60) AS INTEGER) as durationMin,
        courtId,
        start,
        end
      FROM TimeSlot
      ORDER BY start
      LIMIT 50
    `;

    console.log(`📊 Total clases encontradas: ${allSlots.length}\n`);

    let incorrectCount = 0;
    const toFix = [];

    for (const slot of allSlots) {
      if (slot.durationMin !== 60) {
        incorrectCount++;
        console.log(`❌ Clase ID ${slot.id.slice(0, 20)}...`);
        console.log(`   ${slot.startTime} - ${slot.endTime}`);
        console.log(`   Duración actual: ${slot.durationMin} min (debe ser 60)`);
        
        // Calcular el nuevo end correcto (60 minutos después)
        const newEnd = Number(slot.start) + (60 * 60 * 1000);
        const newEndDate = new Date(newEnd);
        
        console.log(`   Nuevo fin: ${newEndDate.toLocaleString('es-ES')}`);
        console.log('');
        
        toFix.push({ id: slot.id, newEnd });
      }
    }

    if (incorrectCount === 0) {
      console.log('✅ Todas las clases tienen duración correcta (60 min)');
      return;
    }

    console.log(`\n⚠️  Encontradas ${incorrectCount} clases con duración incorrecta`);
    console.log(`\n🔧 Corrigiendo ${toFix.length} clases...`);

    for (const fix of toFix) {
      await prisma.$executeRaw`
        UPDATE TimeSlot 
        SET end = ${fix.newEnd},
            updatedAt = ${new Date().toISOString()}
        WHERE id = ${fix.id}
      `;
      console.log(`✅ Corregida: ${fix.id.slice(0, 20)}...`);
    }

    console.log(`\n✅ Corrección completada: ${toFix.length} clases actualizadas`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixClassDurations();
