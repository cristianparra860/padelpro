const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllSlotsDay25() {
  const slots = await prisma.timeSlot.findMany({
    where: {
      start: {
        gte: new Date('2025-11-25T07:00:00.000Z'),
        lt: new Date('2025-11-25T08:00:00.000Z')
      }
    },
    include: {
      instructor: {
        select: { name: true }
      },
      bookings: {
        where: {
          status: { in: ['PENDING', 'CONFIRMED'] }
        },
        include: {
          user: {
            select: { name: true, email: true }
          }
        }
      }
    },
    orderBy: {
      createdAt: 'asc'
    }
  });

  console.log(`📊 TODAS las tarjetas de las 7:00 del día 25: ${slots.length}\n`);

  slots.forEach((s, i) => {
    console.log(`${i + 1}. ${s.instructor.name} - ${s.level}/${s.genderCategory || 'NULL'}`);
    console.log(`   ID: ${s.id.substring(0, 25)}...`);
    console.log(`   Reservas: ${s.bookings.length}`);
    if (s.bookings.length > 0) {
      s.bookings.forEach(b => {
        console.log(`      → ${b.user.name} (${b.user.email}) - Status: ${b.status}`);
      });
    }
    console.log(`   Creada: ${s.createdAt.toLocaleString('es-ES')}`);
    console.log('');
  });

  // Agrupar por nivel
  const byLevel = {};
  slots.forEach(s => {
    byLevel[s.level] = (byLevel[s.level] || 0) + 1;
  });

  console.log('📈 Resumen por nivel:');
  Object.entries(byLevel).forEach(([level, count]) => {
    console.log(`   ${level}: ${count} tarjetas`);
  });

  await prisma.$disconnect();
}

checkAllSlotsDay25();
