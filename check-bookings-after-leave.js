const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBookings() {
  const bookings = await prisma.matchGameBooking.findMany({
    where: {
      matchGame: {
        start: {
          gte: new Date('2026-01-04T09:00:00.000Z'),
          lt: new Date('2026-01-04T09:30:00.000Z')
        }
      }
    },
    include: {
      user: {
        select: { name: true }
      },
      matchGame: {
        select: { start: true, courtNumber: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log('\n📋 Bookings en partida 9:00 AM del 4 de enero:');
  console.log('='.repeat(80));
  
  bookings.forEach((b, idx) => {
    console.log(`\n${idx + 1}. ${b.user.name}:`);
    console.log(`   - ID: ${b.id}`);
    console.log(`   - groupSize: ${b.groupSize}`);
    console.log(`   - status: ${b.status}`);
    console.log(`   - isRecycled: ${b.isRecycled}`);
    console.log(`   - wasConfirmed: ${b.wasConfirmed}`);
    console.log(`   - amountBlocked: €${(b.amountBlocked / 100).toFixed(2)}`);
    console.log(`   - createdAt: ${b.createdAt}`);
  });
  
  const activeBookings = bookings.filter(b => b.status !== 'CANCELLED');
  const recycledBookings = bookings.filter(b => b.isRecycled);
  
  console.log('\n' + '='.repeat(80));
  console.log(`\n📊 Resumen:`);
  console.log(`   - Total bookings: ${bookings.length}`);
  console.log(`   - Activos: ${activeBookings.length}`);
  console.log(`   - Reciclados: ${recycledBookings.length}`);
  
  const totalSlots = activeBookings.reduce((sum, b) => sum + (b.groupSize || 1), 0);
  console.log(`   - Total plazas activas: ${totalSlots}`);
  
  await prisma.$disconnect();
}

checkBookings().catch(console.error);
