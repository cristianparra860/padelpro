const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRecentBookings() {
  // Buscar bookings de María (el usuario de la imagen)
  const users = await prisma.user.findMany({
    where: {
      name: { contains: 'María' }
    },
    select: { id: true, name: true }
  });
  
  console.log('\n👤 Usuarios con nombre María:', users);
  
  if (users.length === 0) {
    console.log('❌ No se encontró usuario María');
    await prisma.$disconnect();
    return;
  }
  
  const mariaId = users[0].id;
  
  // Buscar todos los bookings recientes de María
  const bookings = await prisma.matchGameBooking.findMany({
    where: {
      userId: mariaId
    },
    include: {
      matchGame: {
        select: { 
          id: true,
          start: true, 
          end: true,
          courtNumber: true,
          pricePerPlayer: true,
          courtRentalPrice: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  console.log(`\n📋 Últimos ${bookings.length} bookings de María:`);
  console.log('='.repeat(100));
  
  bookings.forEach((b, idx) => {
    const startDate = new Date(b.matchGame.start);
    console.log(`\n${idx + 1}. Partida ${startDate.toLocaleString('es-ES')}:`);
    console.log(`   - Booking ID: ${b.id}`);
    console.log(`   - MatchGame ID: ${b.matchGameId}`);
    console.log(`   - groupSize: ${b.groupSize}`);
    console.log(`   - status: ${b.status}`);
    console.log(`   - isRecycled: ${b.isRecycled}`);
    console.log(`   - wasConfirmed: ${b.wasConfirmed}`);
    console.log(`   - amountBlocked: €${(b.amountBlocked / 100).toFixed(2)}`);
    console.log(`   - courtNumber: ${b.matchGame.courtNumber || 'Sin asignar'}`);
    console.log(`   - createdAt: ${b.createdAt.toISOString()}`);
  });
  
  // Agrupar por partida
  const byMatchGame = {};
  bookings.forEach(b => {
    if (!byMatchGame[b.matchGameId]) {
      byMatchGame[b.matchGameId] = [];
    }
    byMatchGame[b.matchGameId].push(b);
  });
  
  console.log('\n' + '='.repeat(100));
  console.log('\n📊 Bookings agrupados por partida:');
  
  for (const [mgId, mgBookings] of Object.entries(byMatchGame)) {
    const startDate = new Date(mgBookings[0].matchGame.start);
    const active = mgBookings.filter(b => b.status !== 'CANCELLED');
    const recycled = mgBookings.filter(b => b.isRecycled);
    const totalSlots = active.reduce((sum, b) => sum + (b.groupSize || 1), 0);
    
    console.log(`\n  📅 ${startDate.toLocaleString('es-ES')} (${mgId}):`);
    console.log(`     - Total bookings: ${mgBookings.length}`);
    console.log(`     - Activos: ${active.length} (${totalSlots} plazas)`);
    console.log(`     - Reciclados: ${recycled.length}`);
    console.log(`     - Detalles:`);
    mgBookings.forEach(b => {
      const emoji = b.status === 'CANCELLED' ? '❌' : '✅';
      const recycleEmoji = b.isRecycled ? '♻️' : '';
      console.log(`       ${emoji}${recycleEmoji} groupSize=${b.groupSize}, status=${b.status}, €${(b.amountBlocked/100).toFixed(2)}`);
    });
  }
  
  await prisma.$disconnect();
}

checkRecentBookings().catch(console.error);
