const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testUpdate() {
  console.log('🧪 Test: Actualizar unavailableHours del instructor\n');
  
  try {
    // Obtener primer instructor
    const instructor = await prisma.instructor.findFirst({
      where: { isActive: true }
    });
    
    if (!instructor) {
      console.log('❌ No hay instructores activos');
      return;
    }
    
    console.log(`✅ Instructor encontrado: ${instructor.id}`);
    console.log(`   unavailableHours actual: ${instructor.unavailableHours || 'null'}\n`);
    
    // Intentar actualizar con el formato que envía el componente
    const testData = {
      monday: [{ start: '09:00', end: '15:30' }]
    };
    
    console.log('📝 Intentando actualizar con:', JSON.stringify(testData, null, 2));
    
    const updated = await prisma.instructor.update({
      where: { id: instructor.id },
      data: {
        unavailableHours: JSON.stringify(testData)
      }
    });
    
    console.log('\n✅ Actualización exitosa!');
    console.log(`   unavailableHours nuevo: ${updated.unavailableHours}`);
    
    // Verificar que se puede parsear
    const parsed = JSON.parse(updated.unavailableHours);
    console.log('   Parseado correctamente:', parsed);
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('   Detalles:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testUpdate();
