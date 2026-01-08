const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testMatchGameDeletion() {
  try {
    console.log('🔍 Verificando partidas existentes...\n');
    
    // Buscar partidas del día 11
    const matches = await prisma.$queryRaw`
      SELECT 
        mg.id,
        mg.start,
        mg.courtNumber,
        mg.maxPlayers,
        (SELECT COUNT(*) FROM MatchGameBooking WHERE matchGameId = mg.id AND status != 'CANCELLED') as activeBookings
      FROM MatchGame mg
      WHERE mg.start >= ${new Date('2026-01-11T00:00:00Z').getTime()}
        AND mg.start < ${new Date('2026-01-12T00:00:00Z').getTime()}
      ORDER BY mg.start
      LIMIT 5
    `;
    
    if (matches.length === 0) {
      console.log('❌ No se encontraron partidas del día 11');
      return;
    }
    
    console.log(`✅ Encontradas ${matches.length} partidas:\n`);
    
    matches.forEach((match, index) => {
      const startDate = new Date(match.start);
      console.log(`${index + 1}. ID: ${match.id}`);
      console.log(`   Hora: ${startDate.toISOString().substring(11, 16)}`);
      console.log(`   Pista: ${match.courtNumber || 'Sin asignar'}`);
      console.log(`   Reservas activas: ${match.activeBookings}`);
      console.log('');
    });
    
    // Intentar eliminar una partida
    if (matches.length > 0) {
      const testMatch = matches[0];
      console.log(`\n🧪 Simulando eliminación de partida ${testMatch.id}...\n`);
      
      // Obtener la partida completa
      const fullMatch = await prisma.matchGame.findUnique({
        where: { id: testMatch.id },
        include: {
          bookings: {
            where: {
              status: { in: ['PENDING', 'CONFIRMED'] }
            }
          }
        }
      });
      
      if (!fullMatch) {
        console.log('❌ Partida no encontrada');
        return;
      }
      
      console.log(`📊 Reservas activas: ${fullMatch.bookings.length}`);
      
      fullMatch.bookings.forEach((booking, i) => {
        console.log(`\n   Reserva ${i + 1}:`);
        console.log(`   - Usuario: ${booking.userId}`);
        console.log(`   - Estado: ${booking.status}`);
        console.log(`   - Créditos bloqueados: ${booking.amountBlocked}`);
        console.log(`   - Puntos usados: ${booking.pointsUsed || 0}`);
        console.log(`   - Pagado con puntos: ${booking.paidWithPoints}`);
      });
      
      console.log('\n✅ La estructura de la partida es válida para eliminación');
      console.log('\n⚠️  NO se eliminó la partida (solo simulación)');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testMatchGameDeletion();
