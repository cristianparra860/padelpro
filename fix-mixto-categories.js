const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixMixtoCategories() {
  try {
    console.log('🔧 CORRIGIENDO CATEGORÍAS "MIXTO" EN BASE DE DATOS\n');

    // 1. Verificar cuántas clases tienen categoria "mixto"
    const mixtoSlots = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM TimeSlot 
      WHERE genderCategory = 'mixto' OR category = 'mixto'
    `;

    console.log(`📊 Clases con categoría "mixto": ${mixtoSlots[0].count}\n`);

    if (mixtoSlots[0].count > 0) {
      // 2. Actualizar todas a "ABIERTO"
      console.log('🔄 Actualizando a "ABIERTO"...');
      
      const updated = await prisma.$executeRaw`
        UPDATE TimeSlot 
        SET genderCategory = 'ABIERTO'
        WHERE genderCategory = 'mixto'
      `;

      console.log(`✅ ${updated} clases actualizadas (genderCategory)\n`);

      const updated2 = await prisma.$executeRaw`
        UPDATE TimeSlot 
        SET category = 'ABIERTO'
        WHERE category = 'mixto'
      `;

      console.log(`✅ ${updated2} clases actualizadas (category)\n`);
    }

    // 3. Verificar resultado
    const remaining = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM TimeSlot 
      WHERE genderCategory = 'mixto' OR category = 'mixto'
    `;

    console.log(`📊 Clases con "mixto" restantes: ${remaining[0].count}`);
    
    if (remaining[0].count === 0) {
      console.log('\n✅ TODAS LAS CATEGORÍAS CORREGIDAS');
    } else {
      console.log('\n⚠️ Aún quedan algunas clases con "mixto"');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixMixtoCategories();
