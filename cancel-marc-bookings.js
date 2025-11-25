const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cancelMarcBookings() {
  console.log('🔍 Buscando reservas PENDING de Marc Parra...\n');
  
  // Buscar usuario Marc Parra
  const marc = await prisma.user.findFirst({
    where: { 
      OR: [
        { name: { contains: 'Marc' } },
        { email: { contains: 'marc' } }
      ]
    }
  });
  
  if (!marc) {
    console.log('❌ Usuario Marc no encontrado');
    return;
  }
  
  console.log(`✅ Usuario encontrado: ${marc.name} (${marc.id})\n`);
  
  // Obtener reservas PENDING
  const pendingBookings = await prisma.booking.findMany({
    where: {
      userId: marc.id,
      status: 'PENDING'
    },
    include: {
      timeSlot: {
        select: {
          start: true,
          level: true,
          genderCategory: true,
          instructor: {
            select: { name: true }
          }
        }
      }
    }
  });
  
  console.log(`📊 Reservas PENDING encontradas: ${pendingBookings.length}\n`);
  
  if (pendingBookings.length === 0) {
    console.log('ℹ️ No hay reservas PENDING para cancelar');
    return;
  }
  
  // Mostrar reservas a cancelar
  for (const booking of pendingBookings) {
    const date = new Date(booking.timeSlot.start);
    console.log(`  📅 ${date.toLocaleDateString('es-ES')} ${date.toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'})}`);
    console.log(`     Instructor: ${booking.timeSlot.instructor.name}`);
    console.log(`     Level: ${booking.timeSlot.level} | Category: ${booking.timeSlot.genderCategory || 'N/A'}`);
    console.log(`     GroupSize: ${booking.groupSize} | Amount: €${(booking.amountBlocked/100).toFixed(2)}`);
    console.log();
  }
  
  console.log('🚫 Cancelando reservas...\n');
  
  // Cancelar todas
  const result = await prisma.booking.updateMany({
    where: {
      userId: marc.id,
      status: 'PENDING'
    },
    data: {
      status: 'CANCELLED'
    }
  });
  
  console.log(`✅ ${result.count} reservas canceladas exitosamente`);
  
  // Verificar estado final
  const remainingPending = await prisma.booking.count({
    where: {
      userId: marc.id,
      status: 'PENDING'
    }
  });
  
  console.log(`\n📊 Reservas PENDING restantes: ${remainingPending}`);
}

cancelMarcBookings()
  .then(() => {
    console.log('\n✅ Proceso completado');
    prisma.$disconnect();
  })
  .catch(error => {
    console.error('❌ Error:', error);
    prisma.$disconnect();
    process.exit(1);
  });
