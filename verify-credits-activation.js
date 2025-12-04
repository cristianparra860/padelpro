// Verificar que la activación de créditos se guardó en la base de datos
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  try {
    const slot = await prisma.timeSlot.findUnique({
      where: { id: 'ts-1764307872886-cyestumcbc' }
    });

    if (!slot) {
      console.log('❌ TimeSlot no encontrado');
      return;
    }

    console.log('\n✅ TimeSlot en DB:');
    console.log('   ID:', slot.id);
    console.log('   Fecha:', new Date(slot.start).toLocaleString('es-ES'));
    console.log('   Instructor ID:', slot.instructorId);
    console.log('   creditsSlots:', slot.creditsSlots);
    console.log('   creditsCost:', slot.creditsCost);
    console.log('');

    // Parsear creditsSlots si es string JSON
    if (slot.creditsSlots) {
      try {
        const parsed = JSON.parse(slot.creditsSlots);
        console.log('✅ Credits slots parseados:', parsed);
        console.log('   Modalidad 4 jugadores activada:', parsed.includes(4) ? '✅ SÍ' : '❌ NO');
      } catch (e) {
        console.log('   (No es JSON válido)');
      }
    }

  } catch (error) {
    console.log('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verify();
