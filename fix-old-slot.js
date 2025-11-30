const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixOldSlot() {
  try {
    const timeSlotId = 'ts-1764186363490-vbz4bjmz8';
    const userLevel = 5.0;
    const instructorId = 'instructor-cristian-parra';
    
    // Obtener rangos del instructor
    const instructorData = await prisma.$queryRaw`
      SELECT levelRanges FROM Instructor WHERE id = ${instructorId}
    `;
    
    if (!instructorData[0]?.levelRanges) {
      console.log('❌ Instructor sin rangos configurados');
      return;
    }
    
    const ranges = JSON.parse(instructorData[0].levelRanges);
    console.log('\n📊 Rangos del instructor:', ranges);
    
    // Encontrar el rango que coincide con el nivel del usuario
    const matchingRange = ranges.find(range => 
      userLevel >= range.minLevel && userLevel <= range.maxLevel
    );
    
    if (!matchingRange) {
      console.log('⚠️ No se encontró rango para nivel', userLevel);
      return;
    }
    
    const levelRange = `${matchingRange.minLevel}-${matchingRange.maxLevel}`;
    console.log(`\n🎯 Rango encontrado: ${levelRange}`);
    
    // Actualizar el TimeSlot
    await prisma.$executeRaw`
      UPDATE TimeSlot 
      SET levelRange = ${levelRange}
      WHERE id = ${timeSlotId}
    `;
    
    console.log(`\n✅ TimeSlot ${timeSlotId} actualizado con levelRange: ${levelRange}`);
    
    // Verificar
    const verify = await prisma.$queryRaw`
      SELECT id, level, levelRange, start FROM TimeSlot WHERE id = ${timeSlotId}
    `;
    
    console.log('\n🔍 Verificación:');
    console.log('  ID:', verify[0].id);
    console.log('  Level:', verify[0].level);
    console.log('  LevelRange:', verify[0].levelRange);
    console.log('  Hora:', new Date(Number(verify[0].start)).toLocaleString('es-ES'));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixOldSlot();
