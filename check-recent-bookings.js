const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const bookings = await prisma.booking.findMany({
    where: {
      status: { in: ['PENDING', 'CONFIRMED'] }
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
    orderBy: { createdAt: 'desc' },
    take: 30
  });

  console.log(`\n📚 Últimos 30 bookings:\n`);
  
  bookings.forEach(b => {
    const start = new Date(b.timeSlot.start);
    const fecha = start.toLocaleDateString('es-ES');
    const hora = `${start.getHours()}:${start.getMinutes().toString().padStart(2, '0')}`;
    const instructor = b.timeSlot.instructor?.user?.name || 'Sin instructor';
    
    console.log(`📅 ${fecha} ${hora} - ${instructor}`);
    console.log(`   Usuario: ${b.user.name}, GroupSize: ${b.groupSize}, Status: ${b.status}`);
    console.log(`   CourtId: ${b.timeSlot.courtId || 'NULL (propuesta)'}`);
    console.log('');
  });

  await prisma.$disconnect();
}

main().catch(console.error);
