const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Buscar todos los bookings de diciembre con sus slots
  const bookings = await prisma.booking.findMany({
    where: {
      status: { in: ['PENDING', 'CONFIRMED'] },
      timeSlot: {
        start: {
          gte: new Date('2025-12-01T00:00:00.000Z'),
          lte: new Date('2025-12-31T23:59:59.999Z')
        }
      }
    },
    include: {
      timeSlot: {
        include: {
          instructor: {
            include: {
              user: { select: { name: true } }
            }
          }
        }
      },
      user: {
        select: { name: true }
      }
    },
    orderBy: {
      timeSlot: {
        start: 'asc'
      }
    }
  });

  console.log(`\n📚 Bookings de diciembre: ${bookings.length}\n`);

  // Agrupar por fecha
  const byDate = {};
  bookings.forEach(b => {
    const start = new Date(b.timeSlot.start);
    const dateKey = `${start.getFullYear()}-${(start.getMonth() + 1).toString().padStart(2, '0')}-${start.getDate().toString().padStart(2, '0')}`;
    if (!byDate[dateKey]) byDate[dateKey] = [];
    byDate[dateKey].push(b);
  });

  Object.keys(byDate).sort().forEach(date => {
    const bookingsOfDay = byDate[date];
    console.log(`\n📅 ${date} (${bookingsOfDay.length} bookings)`);
    
    bookingsOfDay.forEach(b => {
      const start = new Date(b.timeSlot.start);
      const hour = start.getHours();
      const minute = start.getMinutes().toString().padStart(2, '0');
      const instructor = b.timeSlot.instructor?.user?.name || 'Sin instructor';
      
      console.log(`  ⏰ ${hour}:${minute} - ${instructor}`);
      console.log(`     Usuario: ${b.user.name}`);
      console.log(`     GroupSize: ${b.groupSize}, Status: ${b.status}`);
      console.log(`     CourtId: ${b.timeSlot.courtId || 'NULL'}`);
    });
  });

  await prisma.$disconnect();
}

main().catch(console.error);
