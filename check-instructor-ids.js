const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('\n🔍 Verificando IDs de instructores...\n');
  
  // Buscar instructor de Cristian Parra
  const instructor = await prisma.instructor.findFirst({
    where: { userId: 'user-cristian-parra' }
  });
  
  console.log('👤 Instructor Cristian Parra:');
  console.log('   ID:', instructor?.id || 'NO ENCONTRADO');
  console.log('   UserID:', instructor?.userId || 'N/A');
  console.log('   Nombre:', instructor?.name || 'N/A');
  console.log('');
  
  // Buscar algunos slots
  const slots = await prisma.timeSlot.findMany({
    where: {
      start: { gte: new Date() }
    },
    take: 10,
    select: {
      id: true,
      instructorId: true,
      start: true,
      instructor: {
        select: {
          name: true
        }
      }
    },
    orderBy: { start: 'asc' }
  });
  
  console.log('📅 Primeros 10 slots futuros:');
  slots.forEach((slot, i) => {
    const date = new Date(Number(slot.start));
    console.log(`   ${i+1}. Slot: ${slot.id.substring(0, 12)}...`);
    console.log(`      Instructor ID: ${slot.instructorId}`);
    console.log(`      Instructor: ${slot.instructor?.name || 'Sin nombre'}`);
    console.log(`      Fecha: ${date.toLocaleString('es-ES')}`);
    console.log(`      ¿Es de Cristian?: ${slot.instructorId === instructor?.id ? '✅ SÍ' : '❌ NO'}`);
    console.log('');
  });
  
  await prisma.$disconnect();
}

main().catch(console.error);
