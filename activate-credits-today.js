const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function activateToday() {
  console.log('🎁 Activando plaza con puntos para HOY\n');
  
  // Buscar Cristian Parra
  const instructor = await prisma.instructor.findFirst({
    where: { name: { contains: 'Cristian Parra' } }
  });
  
  if (!instructor) {
    console.log('❌ Instructor no encontrado');
    await prisma.$disconnect();
    return;
  }
  
  // Buscar slot de HOY
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const slot = await prisma.timeSlot.findFirst({
    where: {
      instructorId: instructor.id,
      start: { gte: today, lt: tomorrow },
      courtId: null // Disponible
    },
    orderBy: { start: 'asc' }
  });
  
  if (!slot) {
    console.log('❌ No hay slots disponibles de Cristian Parra hoy');
    await prisma.$disconnect();
    return;
  }
  
  const date = new Date(slot.start).toLocaleString('es-ES');
  
  console.log(`✅ Slot encontrado:`);
  console.log(`   Fecha: ${date}`);
  console.log(`   ID: ${slot.id}`);
  console.log(`   Instructor: ${instructor.name}\n`);
  
  // Activar modalidad de 2 jugadores con puntos
  await prisma.timeSlot.update({
    where: { id: slot.id },
    data: {
      creditsSlots: JSON.stringify([2]),
      creditsCost: 50
    }
  });
  
  console.log('🎁 ACTUALIZADO:');
  console.log('   creditsSlots: [2]');
  console.log('   creditsCost: 50');
  console.log('\n✅ Ahora la modalidad de 2 jugadores se verá con:');
  console.log('   • Fondo ámbar brillante');
  console.log('   • Icono 🎁 regalo');
  console.log('   • Texto "50p" en ámbar');
  console.log('   • Distintivo dorado "Puntos"');
  console.log('\n📱 Recarga la página para verlo');
  
  await prisma.$disconnect();
}

activateToday().catch(console.error);
