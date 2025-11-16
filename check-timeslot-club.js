const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTimeSlot() {
  const slot = await prisma.timeSlot.findUnique({
    where: { id: 'cmhkwtlu5002ttg7g3xfrr1a8' },
    include: { club: true }
  });
  
  console.log('\n📍 TimeSlot 10:00 del 6 de noviembre:');
  console.log(`   ID: ${slot.id}`);
  console.log(`   Club ID: ${slot.clubId}`);
  console.log(`   Club Nombre: ${slot.club.name}`);
  console.log(`   Pista asignada: ${slot.courtNumber || 'SIN ASIGNAR'}`);
  console.log(`   Categoría: ${slot.genderCategory || 'SIN CATEGORÍA'}`);
  
  await prisma.$disconnect();
}

checkTimeSlot().catch(console.error);
