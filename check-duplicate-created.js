const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDuplicate() {
  const slots = await prisma.timeSlot.findMany({
    where: {
      instructorId: 'cmhkwmdc10005tgqw6fn129he',
      start: new Date('2025-11-28T06:00:00.000Z')
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  console.log(`📊 Total tarjetas para Carlos Martinez el 28/11 a las 7:00: ${slots.length}\n`);
  
  slots.forEach((s, i) => {
    console.log(`${i + 1}. ID: ${s.id.substring(0, 20)}...`);
    console.log(`   Nivel: ${s.level}`);
    console.log(`   Categoría: ${s.genderCategory || 'NULL'}`);
    console.log(`   Cancha: ${s.courtNumber || 'SIN ASIGNAR'}`);
    console.log(`   Creada: ${s.createdAt.toLocaleString('es-ES')}`);
    console.log('');
  });

  await prisma.$disconnect();
}

checkDuplicate();
