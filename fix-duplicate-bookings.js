const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixDuplicates() {
  console.log('🔍 Buscando bookings duplicados del día 26...\n');
  
  // Obtener todos los bookings CONFIRMED del día 26
  const bookings = await prisma.booking.findMany({
    where: {
      status: 'CONFIRMED',
      timeSlot: {
        start: {
          gte: new Date('2025-11-26T00:00:00.000Z'),
          lt: new Date('2025-11-27T00:00:00.000Z')
        }
      }
    },
    include: {
      user: {
        select: { name: true, email: true }
      },
      timeSlot: {
        select: { id: true, start: true, instructorId: true }
      }
    }
  });
  
  console.log(`📋 Total bookings CONFIRMED el día 26: ${bookings.length}\n`);
  
  bookings.forEach(b => {
    console.log(`- ${b.user.name} | TimeSlot: ${b.timeSlot.id.substring(0, 25)} | ${new Date(b.timeSlot.start).toLocaleTimeString()}`);
  });
  
  // Agrupar por usuario + hora
  const groups = new Map();
  bookings.forEach(b => {
    const key = `${b.userId}_${new Date(b.timeSlot.start).getTime()}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(b);
  });
  
  console.log('\n🔍 Buscando duplicados...\n');
  
  // Buscar grupos con más de 1 booking (duplicados)
  let duplicatesFound = false;
  for (const [key, group] of groups.entries()) {
    if (group.length > 1) {
      duplicatesFound = true;
      console.log(`❌ DUPLICADO encontrado: ${group[0].user.name} tiene ${group.length} bookings a las ${new Date(group[0].timeSlot.start).toLocaleTimeString()}`);
      
      // Mantener solo el primero (más antiguo por ID)
      const toKeep = group[0];
      const toDelete = group.slice(1);
      
      console.log(`  ✅ Mantener: ${toKeep.id} en TimeSlot ${toKeep.timeSlot.id.substring(0, 25)}`);
      
      for (const booking of toDelete) {
        console.log(`  ❌ Eliminar: ${booking.id} en TimeSlot ${booking.timeSlot.id.substring(0, 25)}`);
        
        await prisma.booking.delete({
          where: { id: booking.id }
        });
        
        console.log(`  ✅ Eliminado: ${booking.id}`);
      }
    }
  }
  
  if (!duplicatesFound) {
    console.log('✅ No se encontraron duplicados');
  }
  
  console.log('\n✅ Limpieza completada');
  
  await prisma.$disconnect();
}

fixDuplicates();
