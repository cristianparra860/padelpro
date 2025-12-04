const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLevels() {
  try {
    console.log('🔍 Verificando niveles actuales en TimeSlots...\n');
    
    // Clases disponibles (sin pista asignada)
    const openSlots = await prisma.$queryRaw`
      SELECT id, level, levelRange, genderCategory, courtId, start, instructorId
      FROM TimeSlot 
      WHERE courtId IS NULL 
      ORDER BY start 
      LIMIT 10
    `;
    
    console.log(`📊 Clases abiertas (sin pista asignada): ${openSlots.length}\n`);
    
    for (let i = 0; i < openSlots.length; i++) {
      const s = openSlots[i];
      const date = new Date(Number(s.start));
      
      console.log(`${i + 1}. ${date.toLocaleString('es-ES')}`);
      console.log(`   Level: ${s.level || 'NULL'}`);
      console.log(`   LevelRange: ${s.levelRange || 'NULL'}`);
      console.log(`   Género: ${s.genderCategory || 'NULL'}`);
      console.log(`   Instructor: ${s.instructorId || 'NULL'}`);
      console.log('');
    }
    
    // Clases confirmadas (con pista asignada)
    const confirmedSlots = await prisma.$queryRaw`
      SELECT id, level, levelRange, genderCategory, courtNumber, start
      FROM TimeSlot 
      WHERE courtId IS NOT NULL 
      ORDER BY start 
      LIMIT 5
    `;
    
    console.log(`\n📊 Clases confirmadas (con pista): ${confirmedSlots.length}\n`);
    
    for (let i = 0; i < confirmedSlots.length; i++) {
      const s = confirmedSlots[i];
      const date = new Date(Number(s.start));
      
      console.log(`${i + 1}. ${date.toLocaleString('es-ES')} - Pista ${s.courtNumber}`);
      console.log(`   Level: ${s.level || 'NULL'}`);
      console.log(`   LevelRange: ${s.levelRange || 'NULL'}`);
      console.log(`   Género: ${s.genderCategory || 'NULL'}`);
      console.log('');
    }
    
    // Verificar cuántas tienen nivel individual vs rango
    const allSlots = await prisma.$queryRaw`
      SELECT level FROM TimeSlot WHERE level IS NOT NULL
    `;
    
    const individualLevels = allSlots.filter(s => /^\d+\.\d+$/.test(s.level)).length;
    const rangeLevels = allSlots.filter(s => /^\d+\.\d+-\d+\.\d+$/.test(s.level)).length;
    const abierto = allSlots.filter(s => s.level === 'ABIERTO').length;
    
    console.log('\n' + '='.repeat(60));
    console.log('📈 Estadísticas de niveles:');
    console.log(`   Nivel individual (ej: "5.0"): ${individualLevels}`);
    console.log(`   Rango (ej: "5.0-7.0"): ${rangeLevels}`);
    console.log(`   ABIERTO: ${abierto}`);
    console.log(`   Total: ${allSlots.length}`);
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkLevels();
