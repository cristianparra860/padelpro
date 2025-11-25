import { prisma } from './src/lib/prisma.ts';

async function checkDuplicateUserRelations() {
  try {
    const duplicateUserId = 'user-1763673966218-39g60gqe8';
    
    console.log('🔍 REVISANDO VÍNCULOS DEL USUARIO DUPLICADO\n');
    
    // Buscar bookings
    const bookings = await prisma.booking.findMany({
      where: { userId: duplicateUserId },
      include: {
        timeSlot: {
          include: {
            instructor: true
          }
        }
      }
    });
    
    console.log(`📋 Bookings: ${bookings.length}`);
    bookings.forEach(b => {
      console.log(`   - ${b.id} | ${b.timeSlot?.instructor?.name || 'N/A'} | ${b.status}`);
    });
    
    // Buscar transacciones
    const transactions = await prisma.transaction.findMany({
      where: { userId: duplicateUserId }
    });
    
    console.log(`\n💰 Transactions: ${transactions.length}`);
    transactions.forEach(t => {
      console.log(`   - ${t.id} | ${t.amount} | ${t.type}`);
    });
    
    // Buscar matches como jugador
    const matchPlayers = await prisma.matchPlayer.findMany({
      where: { userId: duplicateUserId }
    });
    
    console.log(`\n🎾 MatchPlayers: ${matchPlayers.length}`);
    
    // Obtener datos del usuario
    const user = await prisma.user.findUnique({
      where: { id: duplicateUserId }
    });
    
    console.log(`\n👤 USUARIO:`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Nombre: ${user.name}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Credits: ${user.credits}`);
    
    console.log('\n💡 PLAN DE ELIMINACIÓN:');
    console.log('   1. Eliminar Bookings (si existen)');
    console.log('   2. Eliminar Transactions (si existen)');
    console.log('   3. Eliminar MatchPlayers (si existen)');
    console.log('   4. Eliminar Usuario');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDuplicateUserRelations();
