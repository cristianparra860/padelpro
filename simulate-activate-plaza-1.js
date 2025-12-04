const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function simulateInstructorActivation() {
  try {
    const slotId = 'ts-1764308189412-z9y4veby1rd';
    const instructorId = 'instructor-cristian-parra'; // Cristian Parra
    
    console.log('\n🎯 Simulando instructor activando plaza #1 (índice 0) de modalidad 4 jugadores...\n');
    
    // 1. Verificar instructor
    const instructor = await prisma.instructor.findUnique({
      where: { id: instructorId },
      select: { id: true, name: true }
    });
    console.log(`👤 Instructor: ${instructor.name} (${instructor.id})`);
    
    // 2. Verificar slot
    const slot = await prisma.timeSlot.findUnique({
      where: { id: slotId },
      select: {
        id: true,
        instructorId: true,
        creditsSlots: true
      }
    });
    
    console.log(`📋 Slot antes: creditsSlots = ${slot.creditsSlots}`);
    
    // 3. Verificar ownership
    if (slot.instructorId !== instructor.id) {
      console.error('❌ Instructor no es dueño del slot!');
      return;
    }
    console.log('✅ Instructor es dueño del slot');
    
    // 4. Simular acción: añadir índice 0 a creditsSlots
    // La modalidad de 4 jugadores tiene índices 0, 1, 2, 3
    // Queremos activar solo la primera plaza (índice 0)
    const currentSlots = JSON.parse(slot.creditsSlots || '[]');
    const slotIndex = 0; // Primera plaza de la modalidad de 4
    
    let updatedSlots;
    if (currentSlots.includes(slotIndex)) {
      console.log('⚠️ Plaza ya estaba activada, la desactivamos para re-probar');
      updatedSlots = currentSlots.filter(idx => idx !== slotIndex);
    } else {
      console.log('➕ Añadiendo índice 0 a creditsSlots');
      updatedSlots = [...currentSlots, slotIndex];
    }
    
    // 5. Actualizar en DB
    await prisma.timeSlot.update({
      where: { id: slotId },
      data: { creditsSlots: JSON.stringify(updatedSlots) }
    });
    
    // 6. Verificar actualización
    const updated = await prisma.timeSlot.findUnique({
      where: { id: slotId },
      select: { creditsSlots: true }
    });
    
    console.log(`📋 Slot después: creditsSlots = ${updated.creditsSlots}`);
    
    const parsedSlots = JSON.parse(updated.creditsSlots);
    console.log(`\n✅ Resultado:`);
    console.log(`   - Array de índices: [${parsedSlots.join(', ')}]`);
    console.log(`   - Índice 0 activado: ${parsedSlots.includes(0) ? '✅ SÍ' : '❌ NO'}`);
    console.log(`   - Índice 1 activado: ${parsedSlots.includes(1) ? '✅ SÍ' : '❌ NO'}`);
    console.log(`   - Índice 2 activado: ${parsedSlots.includes(2) ? '✅ SÍ' : '❌ NO'}`);
    console.log(`   - Índice 3 activado: ${parsedSlots.includes(3) ? '✅ SÍ' : '❌ NO'}`);
    
    console.log('\n🔍 Interpretación para modalidad de 4 jugadores:');
    console.log('   - Círculo 1 (índice 0): ' + (parsedSlots.includes(0) ? '🎁 50p (AMBER)' : '€ Libre'));
    console.log('   - Círculo 2 (índice 1): ' + (parsedSlots.includes(1) ? '🎁 50p (AMBER)' : '€ Libre'));
    console.log('   - Círculo 3 (índice 2): ' + (parsedSlots.includes(2) ? '🎁 50p (AMBER)' : '€ Libre'));
    console.log('   - Círculo 4 (índice 3): ' + (parsedSlots.includes(3) ? '🎁 50p (AMBER)' : '€ Libre'));
    
    console.log('\n📱 Ahora abre el navegador:');
    console.log('   1. Navega a http://localhost:9002');
    console.log('   2. Inicia sesión como María García (jugador2@padelpro.com)');
    console.log('   3. Ve a la clase del 2 dic 9:00 AM');
    console.log('   4. Verifica que SOLO el primer círculo (plaza #1) esté en amber con "50p"');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

simulateInstructorActivation();
