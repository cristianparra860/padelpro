const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testBatchEndpoint() {
  console.log('🧪 Probando endpoint batch de creditsSlots\n');
  
  // Buscar el slot que acabamos de actualizar
  const slot = await prisma.timeSlot.findFirst({
    where: {
      id: 'ts-1764308189412-z9y4veby1rd'
    },
    select: {
      id: true,
      start: true,
      creditsSlots: true,
      creditsCost: true,
      instructor: {
        select: { name: true }
      }
    }
  });
  
  if (!slot) {
    console.log('❌ Slot no encontrado');
    await prisma.$disconnect();
    return;
  }
  
  const date = new Date(slot.start).toLocaleString('es-ES');
  
  console.log(`✅ Slot en base de datos:`);
  console.log(`   ID: ${slot.id}`);
  console.log(`   Fecha: ${date}`);
  console.log(`   Instructor: ${slot.instructor?.name}`);
  console.log(`   creditsSlots (raw): ${slot.creditsSlots}`);
  console.log(`   creditsSlots (type): ${typeof slot.creditsSlots}`);
  console.log(`   creditsCost: ${slot.creditsCost}\n`);
  
  // Simular lo que hace el batch endpoint
  let parsed = [];
  try {
    if (slot.creditsSlots) {
      parsed = typeof slot.creditsSlots === 'string' 
        ? JSON.parse(slot.creditsSlots)
        : slot.creditsSlots;
    }
  } catch (e) {
    console.error('❌ Error parseando:', e);
  }
  
  console.log(`📤 Lo que devolvería el batch endpoint:`);
  console.log(`   { "${slot.id}": ${JSON.stringify(parsed)} }\n`);
  
  console.log(`🎨 Evaluación visual por modalidad:\n`);
  [1, 2, 3, 4].forEach(modality => {
    const isCreditsSlot = parsed.includes(modality);
    console.log(`   ${modality} jugador${modality > 1 ? 'es' : ''}:`);
    console.log(`      isCreditsSlot = ${isCreditsSlot}`);
    console.log(`      Visual: ${isCreditsSlot ? '🎁 DORADO' : '⚪ Verde normal'}`);
    console.log('');
  });
  
  await prisma.$disconnect();
}

testBatchEndpoint().catch(console.error);
