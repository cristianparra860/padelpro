const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkFutureBookings() {
  const userId = 'user-1763677035576-wv1t7iun0';
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  console.log(`📅 Fecha actual: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}\n`);
  
  const futureBookings = await prisma.booking.findMany({
    where: {
      userId: userId,
      timeSlot: {
        start: {
          gte: today
        }
      }
    },
    include: {
      timeSlot: true
    },
    orderBy: {
      timeSlot: {
        start: 'asc'
      }
    }
  });
  
  console.log(`🎯 Bookings desde HOY (${new Date(today).toLocaleDateString()}):\n`);
  console.log(`Total: ${futureBookings.length}\n`);
  
  const confirmed = futureBookings.filter(b => b.status === 'CONFIRMED');
  const pending = futureBookings.filter(b => b.status === 'PENDING');
  const cancelled = futureBookings.filter(b => b.status === 'CANCELLED');
  
  console.log(`✅ CONFIRMED: ${confirmed.length}`);
  console.log(`⏳ PENDING: ${pending.length}`);
  console.log(`❌ CANCELLED: ${cancelled.length}\n`);
  
  if (confirmed.length > 0) {
    console.log('━━━ BOOKINGS CONFIRMADOS ━━━\n');
    confirmed.forEach(b => {
      const date = new Date(b.timeSlot.start);
      console.log(`📍 ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`);
      console.log(`   Pista: ${b.timeSlot.courtNumber || 'Sin asignar'}`);
      console.log(`   Players: ${b.groupSize}`);
      console.log(`   ID: ${b.id.substring(0, 30)}...`);
      console.log('');
    });
  }
  
  if (pending.length > 0) {
    console.log('\n━━━ BOOKINGS PENDIENTES ━━━\n');
    pending.forEach(b => {
      const date = new Date(b.timeSlot.start);
      console.log(`⏳ ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`);
      console.log(`   Pista: ${b.timeSlot.courtNumber || 'Sin asignar'}`);
      console.log(`   Players: ${b.groupSize}`);
      console.log(`   ID: ${b.id.substring(0, 30)}...`);
      console.log('');
    });
  }
  
  await prisma.$disconnect();
}

checkFutureBookings();
