const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTimestamps() {
  console.log('🔍 Verificando timestamps de TimeSlots del día 25...\n');
  
  // Buscar sin filtro de fecha para ver qué hay
  const allSlots = await prisma.timeSlot.findMany({
    where: {
      OR: [
        {
          start: {
            gte: new Date('2025-11-24T00:00:00.000Z'),
            lt: new Date('2025-11-26T00:00:00.000Z')
          }
        },
        {
          start: {
            gte: new Date('2025-11-25T00:00:00.000Z'),
            lt: new Date('2025-11-26T00:00:00.000Z')
          }
        }
      ]
    },
    select: {
      id: true,
      start: true,
      level: true,
      instructor: {
        select: { name: true }
      },
      bookings: {
        where: {
          status: { in: ['PENDING', 'CONFIRMED'] }
        },
        select: {
          id: true,
          user: {
            select: { name: true }
          }
        }
      }
    },
    orderBy: {
      start: 'asc'
    }
  });

  console.log(`Total slots encontrados: ${allSlots.length}\n`);

  allSlots.forEach(slot => {
    const date = new Date(slot.start);
    const day = date.getDate();
    const hour = date.getHours();
    const bookingsCount = slot.bookings.length;
    
    console.log(`Día ${day}, Hora ${hour}:00 - ${slot.instructor.name} - ${slot.level} - ${bookingsCount} reservas`);
    if (bookingsCount > 0) {
      slot.bookings.forEach(b => {
        console.log(`   - ${b.user.name}`);
      });
    }
  });

  // Ahora buscar todos los bookings de Marc Parra sin filtro de fecha
  console.log('\n🔍 Buscando todas las reservas de Marc Parra (jugador1@padelpro.com)...\n');
  
  const marc = await prisma.user.findFirst({
    where: { email: 'jugador1@padelpro.com' }
  });

  if (!marc) {
    console.log('❌ Usuario no encontrado');
    return;
  }

  const marcBookings = await prisma.booking.findMany({
    where: {
      userId: marc.id
    },
    include: {
      timeSlot: {
        select: {
          start: true,
          level: true,
          instructor: { select: { name: true } }
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 10
  });

  console.log(`Total reservas de Marc: ${marcBookings.length}\n`);

  marcBookings.forEach((b, i) => {
    const date = new Date(b.timeSlot.start);
    console.log(`${i + 1}. ${date.toLocaleDateString('es-ES')} ${date.getHours()}:00`);
    console.log(`   Instructor: ${b.timeSlot.instructor.name}`);
    console.log(`   Status: ${b.status}`);
    console.log(`   Nivel: ${b.timeSlot.level}`);
    console.log(`   Creada: ${b.createdAt.toLocaleString('es-ES')}`);
  });

  await prisma.$disconnect();
}

checkTimestamps();
