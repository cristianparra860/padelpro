const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllDay25() {
  const slots = await prisma.timeSlot.findMany({
    where: {
      start: {
        gte: new Date('2025-11-25T00:00:00.000Z'),
        lt: new Date('2025-11-26T00:00:00.000Z')
      }
    },
    select: {
      id: true,
      start: true,
      level: true,
      genderCategory: true,
      courtNumber: true,
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

  console.log(`📊 Total clases día 25: ${slots.length}\n`);

  if (slots.length === 0) {
    console.log('❌ No hay clases generadas para el día 25');
    return;
  }

  // Agrupar por hora
  const byHour = {};
  slots.forEach(s => {
    const hour = new Date(s.start).getHours();
    if (!byHour[hour]) byHour[hour] = [];
    byHour[hour].push(s);
  });

  Object.entries(byHour).sort((a, b) => parseInt(a[0]) - parseInt(b[0])).forEach(([hour, hourSlots]) => {
    console.log(`⏰ ${hour}:00 - ${hourSlots.length} tarjetas`);
    hourSlots.forEach(s => {
      const bookingUsers = s.bookings.map(b => b.user.name).join(', ') || 'Sin reservas';
      console.log(`   ${s.instructor.name} - ${s.level}/${s.genderCategory || 'NULL'} - ${s.bookings.length} reservas - Cancha: ${s.courtNumber || 'N/A'}`);
      if (s.bookings.length > 0) {
        console.log(`      → ${bookingUsers}`);
      }
    });
    console.log('');
  });

  await prisma.$disconnect();
}

checkAllDay25();
