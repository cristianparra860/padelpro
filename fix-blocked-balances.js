const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixBlockedBalances() {
  try {
    console.log('=== FIXING BLOCKED BALANCES FOR ALL USERS ===\n');
    
    // Obtener todos los usuarios
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true }
    });
    
    for (const user of users) {
      console.log(`\n👤 Processing: ${user.name} (${user.email})`);
      
      // Obtener todas las reservas PENDING
      const pendingBookings = await prisma.booking.findMany({
        where: {
          userId: user.id,
          status: 'PENDING',
          timeSlot: {
            courtId: null // Solo clases incompletas
          }
        },
        select: {
          id: true,
          amountBlocked: true,
          paidWithPoints: true,
          pointsUsed: true
        }
      });
      
      if (pendingBookings.length === 0) {
        console.log('   No pending bookings');
        continue;
      }
      
      // Calcular créditos bloqueados (máximo de las clases pendientes con euros)
      const creditsBookings = pendingBookings.filter(b => !b.paidWithPoints);
      const maxCredits = creditsBookings.length > 0 
        ? Math.max(...creditsBookings.map(b => b.amountBlocked || 0))
        : 0;
      
      // Calcular puntos bloqueados (suma de todas las clases pendientes con puntos)
      const pointsBookings = pendingBookings.filter(b => b.paidWithPoints);
      const totalPoints = pointsBookings.reduce((sum, b) => sum + (b.pointsUsed || 0), 0);
      
      console.log(`   Pending bookings: ${pendingBookings.length}`);
      console.log(`   - Credits bookings: ${creditsBookings.length} → Max blocked: ${maxCredits}€`);
      console.log(`   - Points bookings: ${pointsBookings.length} → Total blocked: ${totalPoints} pts`);
      
      // Actualizar usuario
      await prisma.user.update({
        where: { id: user.id },
        data: {
          blockedCredits: maxCredits,
          blockedPoints: totalPoints
        }
      });
      
      console.log(`   ✅ Updated: blockedCredits=${maxCredits}€, blockedPoints=${totalPoints} pts`);
    }
    
    console.log('\n✅ ALL USERS UPDATED SUCCESSFULLY');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixBlockedBalances();
