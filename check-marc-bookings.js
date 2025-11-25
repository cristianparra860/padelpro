const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMarcBookings() {
  console.log('🔍 Buscando reservas de Marc Parra...\n');
  
  // Buscar usuario Marc Parra
  const marc = await prisma.user.findFirst({
    where: {
      email: 'jugador1@padelpro.com'
    }
  });

  if (!marc) {
    console.log('❌ Usuario Marc Parra no encontrado');
    return;
  }

  console.log(`✅ Usuario encontrado: ${marc.name} (${marc.email})`);
  console.log(`   ID: ${marc.id}`);
  console.log(`   Nivel: ${marc.level}`);
  console.log(`   Género: ${marc.gender}\n`);

  // Buscar todas las reservas del día 24
  const bookings = await prisma.booking.findMany({
    where: {
      userId: marc.id,
      timeSlot: {
        start: {
          gte: new Date('2025-11-24T00:00:00.000Z'),
          lt: new Date('2025-11-25T00:00:00.000Z')
        }
      }
    },
    include: {
      timeSlot: {
        include: {
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

  console.log(`📊 Total reservas de Marc el día 24: ${bookings.length}\n`);

  bookings.forEach((b, i) => {
    const hour = new Date(b.timeSlot.start).getHours();
    console.log(`${i + 1}. TimeSlot: ${b.timeSlotId.substring(0, 25)}...`);
    console.log(`   Hora: ${hour}:00`);
    console.log(`   Instructor: ${b.timeSlot.instructor.name}`);
    console.log(`   Status: ${b.status}`);
    console.log(`   GroupSize: ${b.groupSize}`);
    console.log(`   Nivel actual del slot: ${b.timeSlot.level}`);
    console.log(`   Categoría actual del slot: ${b.timeSlot.genderCategory || 'NULL'}`);
    console.log(`   Creada: ${b.createdAt.toLocaleString('es-ES')}`);
    console.log('');
  });

  // Agrupar por status
  const byStatus = {};
  bookings.forEach(b => {
    byStatus[b.status] = (byStatus[b.status] || 0) + 1;
  });

  console.log('📈 Resumen por status:');
  Object.entries(byStatus).forEach(([status, count]) => {
    console.log(`   ${status}: ${count} reservas`);
  });

  await prisma.$disconnect();
}

checkMarcBookings();
