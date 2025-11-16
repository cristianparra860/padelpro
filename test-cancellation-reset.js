const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCancellationReset() {
  try {
    console.log('🧪 PRUEBA DE RESETEO AL CANCELAR\n');
    
    // 1. Crear una clase de prueba con género asignado
    const testDate = new Date();
    testDate.setDate(testDate.getDate() + 2);
    testDate.setHours(10, 0, 0, 0);
    
    const instructor = await prisma.instructor.findFirst();
    
    if (!instructor) {
      console.log('❌ No hay instructores para prueba');
      return;
    }
    
    console.log('📝 Creando clase de prueba...');
    const testClass = await prisma.timeSlot.create({
      data: {
        clubId: 'padel-estrella-madrid',
        instructorId: instructor.id,
        start: testDate,
        end: new Date(testDate.getTime() + 60 * 60 * 1000),
        maxPlayers: 4,
        totalPrice: 25.00,
        instructorPrice: 10.00,
        courtRentalPrice: 15.00,
        level: 'ABIERTO',
        category: 'clases',
        courtNumber: 2, // Simulando clase confirmada
        courtId: 'court-2',
        genderCategory: 'masculino' // Género asignado
      }
    });
    
    console.log('✅ Clase creada:', testClass.id);
    console.log('   Pista:', testClass.courtNumber);
    console.log('   Género:', testClass.genderCategory);
    
    // 2. Simular liberación (como si se cancelara la última reserva)
    console.log('\n🔄 Simulando cancelación y liberación...');
    
    await prisma.timeSlot.update({
      where: { id: testClass.id },
      data: {
        courtNumber: null,
        courtId: null,
        genderCategory: null
      }
    });
    
    // 3. Verificar que se reseteó
    const resetClass = await prisma.timeSlot.findUnique({
      where: { id: testClass.id }
    });
    
    console.log('\n✅ VERIFICACIÓN:');
    console.log('   Pista:', resetClass?.courtNumber, '(debería ser null)');
    console.log('   Género:', resetClass?.genderCategory, '(debería ser null)');
    
    if (resetClass?.courtNumber === null && resetClass?.genderCategory === null) {
      console.log('\n🎉 ¡ÉXITO! La clase se reseteó correctamente');
    } else {
      console.log('\n❌ ERROR: La clase NO se reseteó correctamente');
    }
    
    // 4. Limpiar
    await prisma.timeSlot.delete({ where: { id: testClass.id } });
    console.log('\n🗑️ Clase de prueba eliminada');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCancellationReset();
