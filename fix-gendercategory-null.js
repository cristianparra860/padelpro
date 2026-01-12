const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('🔧 Corrigiendo genderCategory "null" a NULL real...\n');
    
    // Actualizar todos los TimeSlots que tienen genderCategory como string "null"
    const result = await prisma.timeSlot.updateMany({
      where: {
        genderCategory: "null"
      },
      data: {
        genderCategory: null
      }
    });
    
    console.log(`✅ Actualizados ${result.count} TimeSlots`);
    
    // Verificar resultado
    const nullCount = await prisma.timeSlot.count({
      where: {
        genderCategory: null
      }
    });
    
    const stringNullCount = await prisma.timeSlot.count({
      where: {
        genderCategory: "null"
      }
    });
    
    console.log(`\n📊 Resultado:`);
    console.log(`   Con genderCategory = NULL: ${nullCount}`);
    console.log(`   Con genderCategory = "null": ${stringNullCount}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
})();
