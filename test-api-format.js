const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testAPIFormat() {
  try {
    const timeSlotId = 'ts-1764186363490-vbz4bjmz8'; // El de las 07:30
    
    // Simulargran lo que hace la API de timeslots
    const slots = await prisma.$queryRaw`
      SELECT * FROM TimeSlot 
      WHERE id = ${timeSlotId}
    `;
    
    if (slots.length === 0) {
      console.log('❌ Slot no encontrado');
      return;
    }
    
    const slot = slots[0];
    
    console.log('\n📊 DATOS RAW DEL SLOT:');
    console.log('═══════════════════════════════════════');
    console.log('ID:', slot.id);
    console.log('Level:', slot.level);
    console.log('LevelRange:', slot.levelRange);
    console.log('GenderCategory:', slot.genderCategory);
    console.log('Start:', new Date(Number(slot.start)).toLocaleString('es-ES'));
    
    // Simular el formato de la API
    const apiResponse = {
      id: slot.id,
      level: slot.level,
      levelRange: slot.levelRange || null,  // ← Esto es lo que hace la API
      genderCategory: slot.genderCategory,
      start: new Date(Number(slot.start)).toISOString()
    };
    
    console.log('\n📡 RESPUESTA API (simulada):');
    console.log('═══════════════════════════════════════');
    console.log(JSON.stringify(apiResponse, null, 2));
    
    console.log('\n🔍 VERIFICACIÓN:');
    console.log('═══════════════════════════════════════');
    console.log('¿levelRange tiene valor?', slot.levelRange ? '✅ SÍ' : '❌ NO (es NULL)');
    console.log('Valor de levelRange:', JSON.stringify(slot.levelRange));
    console.log('Tipo de dato:', typeof slot.levelRange);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testAPIFormat();
