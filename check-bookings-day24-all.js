const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBookingsDay24() {
  console.log('🔍 Buscando TODAS las reservas del día 24 (incluyendo canceladas)...\n');
  
  // Obtener slots del día 24 hora 7
  const slots = await prisma.timeSlot.findMany({
    where: {
      start: {
        gte: new Date('2025-11-24T07:00:00.000Z'),
        lt: new Date('2025-11-24T08:00:00.000Z')
      }
    },
    select: {
      id: true,
      level: true,
      genderCategory: true,
      instructor: {
        select: { name: true }
      }
    }
  });

  console.log(`📊 Slots encontrados a las 7:00h: ${slots.length}\n`);

  for (const slot of slots) {
    const bookings = await prisma.booking.findMany({
      where: {
        timeSlotId: slot.id
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            level: true,
            gender: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`📋 Slot: ${slot.id.substring(0, 25)}...`);
    console.log(`   Instructor: ${slot.instructor.name}`);
    console.log(`   Nivel actual: ${slot.level} | Categoría: ${slot.genderCategory || 'NULL'}`);
    console.log(`   Reservas totales: ${bookings.length}`);
    
    if (bookings.length > 0) {
      bookings.forEach(b => {
        console.log(`     - ${b.user.name} (${b.user.level}/${b.user.gender})`);
        console.log(`       Status: ${b.status} | GroupSize: ${b.groupSize}`);
        console.log(`       Creada: ${b.createdAt.toLocaleString('es-ES')}`);
      });
    } else {
      console.log(`     (sin reservas)`);
    }
    console.log('');
  }

  await prisma.$disconnect();
}

checkBookingsDay24();
