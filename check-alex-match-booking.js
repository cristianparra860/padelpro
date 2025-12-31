// Script para verificar la partida reservada por Alex García
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAlexMatchBooking() {
  try {
    console.log('🎾 Buscando reserva de partida de Alex García...\n');
    
    // Buscar usuario Alex
    const alex = await prisma.user.findFirst({
      where: {
        email: 'alex@example.com'
      }
    });
    
    if (!alex) {
      console.log('❌ No se encontró Alex García');
      return;
    }
    
    console.log('✅ Usuario encontrado:', alex.name);
    console.log('  - ID:', alex.id);
    console.log('  - Créditos:', alex.credits, 'céntimos =', (alex.credits / 100).toFixed(2), '€');
    console.log('  - Bloqueados:', alex.blockedCredits, 'céntimos =', (alex.blockedCredits / 100).toFixed(2), '€');
    console.log('  - Disponibles:', alex.credits - alex.blockedCredits, 'céntimos =', ((alex.credits - alex.blockedCredits) / 100).toFixed(2), '€\n');
    
    // Buscar reservas de partidas
    const matchBookings = await prisma.matchGameBooking.findMany({
      where: {
        userId: alex.id,
        status: {
          in: ['PENDING', 'CONFIRMED']
        }
      },
      include: {
        matchGame: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    });
    
    console.log(`📋 Reservas de partidas activas: ${matchBookings.length}\n`);
    
    matchBookings.forEach((booking, index) => {
      const startTime = new Date(booking.matchGame.start);
      const timeString = startTime.toLocaleString('es-ES');
      
      console.log(`\n🎾 Reserva ${index + 1}`);
      console.log('─────────────────────────────────');
      console.log('ID Booking:', booking.id);
      console.log('ID MatchGame:', booking.matchGameId);
      console.log('Fecha/Hora:', timeString);
      console.log('Status:', booking.status);
      console.log('Método pago:', booking.paymentMethod);
      console.log('Pagado con puntos:', booking.paidWithPoints ? 'SÍ' : 'NO');
      console.log('amountBlocked:', booking.amountBlocked, 'céntimos =', (booking.amountBlocked / 100).toFixed(2), '€');
      console.log('pointsUsed:', booking.pointsUsed);
      console.log('\nMatchGame Info:');
      console.log('  - isOpen:', booking.matchGame.isOpen);
      console.log('  - level:', booking.matchGame.level || 'Sin definir');
      console.log('  - genderCategory:', booking.matchGame.genderCategory || 'Sin definir');
      console.log('  - pricePerPlayer:', booking.matchGame.pricePerPlayer, '€');
      console.log('  - courtRentalPrice:', booking.matchGame.courtRentalPrice, '€');
      console.log('  - maxPlayers:', booking.matchGame.maxPlayers);
      console.log('  - duration:', booking.matchGame.duration, 'min');
      
      if (booking.amountBlocked === 0 && !booking.paidWithPoints) {
        console.log('\n⚠️ PROBLEMA DETECTADO: amountBlocked es 0 y no se pagó con puntos');
        console.log('   Precio esperado:', booking.matchGame.pricePerPlayer, '€');
        console.log('   Céntimos esperados:', Math.round(booking.matchGame.pricePerPlayer * 100));
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAlexMatchBooking();
