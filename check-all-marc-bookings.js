const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Buscando TODAS las reservas de Marc...\n');
  
  // Buscar Marc
  const marc = await prisma.user.findFirst({
    where: { name: { contains: 'Marc' } }
  });
  
  if (!marc) {
    console.log('❌ Marc no encontrado');
    return;
  }
  
  console.log(`Usuario: ${marc.name} (${marc.id})\n`);
  
  // Todas las reservas sin filtro de fecha
  const all = await prisma.booking.findMany({
    where: { userId: marc.id },
    include: {
      timeSlot: {
        select: {
          id: true,
          start: true,
          instructorId: true,
          courtId: true,
          level: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 20
  });
  
  console.log(`📊 Total reservas (todas): ${all.length}\n`);
  
  if (all.length === 0) {
    console.log('❌ NO TIENE NINGUNA RESERVA EN LA BASE DE DATOS\n');
    console.log('Esto significa que cuando Marc hizo la reserva, NO se guardó.');
    return;
  }
  
  all.forEach((b, i) => {
    const d = new Date(Number(b.timeSlot.start));
    console.log(`${i+1}. ${d.toLocaleDateString('es-ES')} ${d.toLocaleTimeString('es-ES')}`);
    console.log(`   Status: ${b.status}`);
    console.log(`   TimeSlot: ${b.timeSlotId.substring(0, 25)}...`);
    console.log(`   Instructor: ${b.timeSlot.instructorId}`);
    console.log(`   Court: ${b.timeSlot.courtId || 'NULL'}`);
    console.log(`   GroupSize: ${b.groupSize}`);
    console.log('');
  });
  
  await prisma.$disconnect();
}

main();
