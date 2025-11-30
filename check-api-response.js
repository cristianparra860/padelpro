const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAPI() {
  try {
    const timeSlotId = 'ts-1764186363490-vbz4bjmz8';
    
    // Verificar en la base de datos
    const dbSlot = await prisma.$queryRaw`
      SELECT id, level, levelRange, genderCategory, start 
      FROM TimeSlot 
      WHERE id = ${timeSlotId}
    `;
    
    console.log('\n📊 Estado en la BASE DE DATOS:');
    console.log('═══════════════════════════════════════');
    console.log('ID:', dbSlot[0].id);
    console.log('Level:', dbSlot[0].level);
    console.log('LevelRange:', dbSlot[0].levelRange);
    console.log('GenderCategory:', dbSlot[0].genderCategory);
    console.log('Start:', new Date(Number(dbSlot[0].start)).toLocaleString('es-ES'));
    
    // Simular lo que hace la API
    console.log('\n📡 Lo que DEBERÍA devolver la API:');
    console.log('═══════════════════════════════════════');
    console.log(JSON.stringify({
      id: dbSlot[0].id,
      level: dbSlot[0].level,
      levelRange: dbSlot[0].levelRange,
      genderCategory: dbSlot[0].genderCategory
    }, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAPI();
