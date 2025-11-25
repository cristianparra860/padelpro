const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllBookingsDay25() {
  console.log('🔍 Buscando TODAS las reservas del día 25 (todos los usuarios)...\n');
  
  const allBookings = await prisma.booking.findMany({
    where: {
      timeSlot: {
        start: {
          gte: new Date('2025-11-25T00:00:00.000Z'),
          lt: new Date('2025-11-26T00:00:00.000Z')
        }
      }
    },
    include: {
      user: {
        select: {
          name: true,
          email: true
        }
      },
      timeSlot: {
        select: {
          start: true,
          level: true,
          instructor: {
            select: { name: true }
          }
        }
      }
    },
    orderBy: [
      { timeSlot: { start: 'asc' } },
      { createdAt: 'desc' }
    ]
  });

  console.log(`📊 Total reservas del día 25: ${allBookings.length}\n`);

  if (allBookings.length === 0) {
    console.log('❌ NO HAY NINGUNA RESERVA en la base de datos para el día 25');
    return;
  }

  allBookings.forEach((b, i) => {
    const hour = new Date(b.timeSlot.start).getHours();
    console.log(`${i + 1}. ${b.user.name} (${b.user.email})`);
    console.log(`   Instructor: ${b.timeSlot.instructor.name}`);
    console.log(`   Hora: ${hour}:00`);
    console.log(`   Status: ${b.status}`);
    console.log(`   GroupSize: ${b.groupSize}`);
    console.log(`   Slot nivel: ${b.timeSlot.level}`);
    console.log(`   Creada: ${b.createdAt.toLocaleString('es-ES')}`);
    console.log('');
  });

  // Contar por usuario
  const byUser = {};
  allBookings.forEach(b => {
    const userName = b.user.name;
    byUser[userName] = (byUser[userName] || 0) + 1;
  });

  console.log('📈 Resumen por usuario:');
  Object.entries(byUser).forEach(([user, count]) => {
    console.log(`   ${user}: ${count} reserva(s)`);
  });

  await prisma.$disconnect();
}

checkAllBookingsDay25();
