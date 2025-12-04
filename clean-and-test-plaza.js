const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanAndTest() {
  try {
    // 1. Limpiar creditsSlots del slot de Cristian Parra
    const slotId = 'ts-1764308189412-z9y4veby1rd';
    
    console.log('\n🧹 Limpiando creditsSlots del slot de Cristian Parra...');
    await prisma.timeSlot.update({
      where: { id: slotId },
      data: { creditsSlots: '[]' }
    });
    
    console.log('✅ Limpiado. Verificando...');
    const cleaned = await prisma.timeSlot.findUnique({
      where: { id: slotId },
      select: {
        id: true,
        start: true,
        instructorId: true,
        creditsSlots: true,
        creditsCost: true,
        instructor: {
          select: { name: true }
        }
      }
    });
    
    console.log('\n📋 Estado actual del slot:');
    console.log(`   Instructor: ${cleaned.instructor.name}`);
    console.log(`   Fecha: ${new Date(Number(cleaned.start)).toLocaleString('es-ES')}`);
    console.log(`   creditsSlots: ${cleaned.creditsSlots}`);
    console.log(`   creditsCost: ${cleaned.creditsCost}`);
    
    console.log('\n✅ Listo para prueba manual:');
    console.log('   1. Inicia sesión como Cristian Parra (instructor4@padelpro.com)');
    console.log('   2. Ve a la clase del 2 dic a las 9:00 AM');
    console.log('   3. Haz clic en el botón 🎁/€ del PRIMER círculo de la modalidad 4 jugadores');
    console.log('   4. Verifica que solo ese círculo se pone amber');
    console.log('   5. Cierra sesión e inicia como María García (jugador2@padelpro.com)');
    console.log('   6. Ve a la misma clase');
    console.log('   7. Verifica que solo el primer círculo muestra "50p" y es amber');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanAndTest();
