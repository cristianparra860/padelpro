const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMarcDay25() {
  // Buscar usuario Marc Parra
  const marc = await prisma.user.findFirst({
    where: {
      email: 'jugador1@padelpro.com'
    }
  });

  if (!marc) {
    console.log('❌ Usuario no encontrado');
    return;
  }

  console.log(`✅ Usuario: ${marc.name} (${marc.email})\n`);

  // Buscar TODAS las reservas del día 25 (incluyendo canceladas)
  const bookings = await prisma.booking.findMany({
    where: {
      userId: marc.id,
      timeSlot: {
        start: {
          gte: new Date('2025-11-25T00:00:00.000Z'),
          lt: new Date('2025-11-26T00:00:00.000Z')
        }
      }
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
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  console.log(`📊 Total reservas de Marc el día 25: ${bookings.length}\n`);

  if (bookings.length === 0) {
    console.log('❌ No se encontraron reservas. Las inscripciones NO se guardaron en la base de datos.');
    console.log('   Revisa los logs del servidor para ver si hubo errores.\n');
    return;
  }

  bookings.forEach((b, i) => {
    const hour = new Date(b.timeSlot.start).getHours();
    console.log(`${i + 1}. ${b.timeSlot.instructor.name} - ${hour}:00`);
    console.log(`   TimeSlot: ${b.timeSlotId.substring(0, 25)}...`);
    console.log(`   Status: ${b.status}`);
    console.log(`   GroupSize: ${b.groupSize}`);
    console.log(`   Nivel slot: ${b.timeSlot.level}`);
    console.log(`   Categoría slot: ${b.timeSlot.genderCategory || 'NULL'}`);
    console.log(`   Creada: ${b.createdAt.toLocaleString('es-ES')}`);
    console.log('');
  });

  await prisma.$disconnect();
}

checkMarcDay25();
