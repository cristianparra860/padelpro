const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testMatchBookingFlow() {
  console.log('🎾 PRUEBA COMPLETA DEL SISTEMA DE PARTIDAS\n');
  console.log('='.repeat(60));
  
  try {
    // 1. Buscar un usuario de prueba
    console.log('\n📋 PASO 1: Buscar usuario de prueba...');
    const user = await prisma.user.findFirst({
      where: {
        email: 'alex@example.com'
      }
    });
    
    if (!user) {
      console.log('❌ No se encontró usuario alex@example.com');
      return;
    }
    
    console.log(`✅ Usuario encontrado: ${user.name}`);
    console.log(`   Créditos actuales: ${user.credits}`);
    const creditosIniciales = user.credits;
    
    // 2. Buscar partidas disponibles
    console.log('\n📋 PASO 2: Buscar partidas disponibles...');
    const matchGames = await prisma.matchGame.findMany({
      where: {
        courtNumber: null, // Solo partidas sin asignar
        start: {
          gte: new Date()
        }
      },
      include: {
        bookings: {
          where: {
            status: { in: ['PENDING', 'CONFIRMED'] }
          }
        }
      },
      take: 1,
      orderBy: { start: 'asc' }
    });
    
    if (matchGames.length === 0) {
      console.log('❌ No hay partidas disponibles para probar');
      console.log('💡 Creando una partida de prueba...');
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(18, 0, 0, 0);
      
      const newMatch = await prisma.matchGame.create({
        data: {
          clubId: 'club-1',
          start: tomorrow,
          end: new Date(tomorrow.getTime() + 90 * 60 * 1000),
          pricePerPlayer: 500,
          courtRentalPrice: 2000,
          isOpen: true,
          genderCategory: 'mixto'
        }
      });
      
      matchGames.push(newMatch);
      console.log(`✅ Partida creada: ${newMatch.id}`);
    }
    
    const match = matchGames[0];
    const jugadoresActuales = match.bookings?.length || 0;
    const precioReserva = match.pricePerPlayer || 0;
    
    console.log(`✅ Partida seleccionada: ${match.id}`);
    console.log(`   Fecha: ${new Date(match.start).toLocaleString()}`);
    console.log(`   Precio por jugador: ${precioReserva} créditos`);
    console.log(`   Jugadores: ${jugadoresActuales}/4`);
    console.log(`   Tipo: ${match.isOpen ? 'Abierta' : 'Clasificada'}`);
    
    // 3. Verificar que el usuario tiene créditos suficientes
    if (user.credits < precioReserva) {
      console.log(`\n⚠️ Usuario no tiene créditos suficientes (${user.credits} < ${precioReserva})`);
      console.log('💡 Agregando créditos...');
      
      await prisma.user.update({
        where: { id: user.id },
        data: { credits: precioReserva + 1000 }
      });
      
      console.log(`✅ Créditos agregados. Nuevo saldo: ${match.price + 1000}`);
    }
    
    // 4. Crear reserva
    console.log('\n📋 PASO 3: Crear reserva en la partida...');
    const booking = await prisma.matchGameBooking.create({
      data: {
        userId: user.id,
        matchGameId: match.id,
        status: 'PENDING'
      }
    });
    
    console.log(`✅ Reserva creada: ${booking.id}`);
    console.log(`   Estado: ${booking.status}`);
    
    // 5. Verificar que se restaron créditos
    console.log('\n📋 PASO 4: Verificar descuento de créditos...');
    const userAfterBooking = await prisma.user.findUnique({
      where: { id: user.id }
    });
    
    const creditosRestados = creditosIniciales - userAfterBooking.credits;
    console.log(`   Créditos antes: ${creditosIniciales}`);
    console.log(`   Créditos ahora: ${userAfterBooking.credits}`);
    console.log(`   Diferencia: ${creditosRestados}`);
    
    if (creditosRestados === precioReserva) {
      console.log('✅ Créditos descontados correctamente');
    } else {
      console.log(`⚠️ Diferencia en créditos: esperado ${precioReserva}, real ${creditosRestados}`);
    }
    
    // 6. Verificar que aparece en bookings del usuario
    console.log('\n📋 PASO 5: Verificar que aparece en bookings del usuario...');
    const userBookings = await prisma.matchGameBooking.findMany({
      where: {
        userId: user.id,
        matchGameId: match.id
      },
      include: {
        matchGame: true
      }
    });
    
    console.log(`✅ Encontradas ${userBookings.length} reservas de este usuario en esta partida`);
    
    // 7. Verificar total de jugadores
    console.log('\n📋 PASO 6: Verificar total de jugadores en la partida...');
    const allBookings = await prisma.matchGameBooking.findMany({
      where: {
        matchGameId: match.id,
        status: { in: ['PENDING', 'CONFIRMED'] }
      }
    });
    
    console.log(`   Total jugadores: ${allBookings.length}/4`);
    
    if (allBookings.length === 4) {
      console.log('🎉 ¡PARTIDA COMPLETA! Debería asignarse pista automáticamente');
    }
    
    // 8. Cancelar la reserva
    console.log('\n📋 PASO 7: Cancelar reserva...');
    await prisma.matchGameBooking.update({
      where: { id: booking.id },
      data: { status: 'CANCELLED' }
    });
    
    console.log('✅ Reserva cancelada');
    
    // 9. Verificar devolución de créditos
    console.log('\n📋 PASO 8: Verificar devolución de créditos...');
    const userAfterCancel = await prisma.user.findUnique({
      where: { id: user.id }
    });
    
    console.log(`   Créditos después de cancelar: ${userAfterCancel.credits}`);
    
    if (userAfterCancel.credits === creditosIniciales) {
      console.log('✅ Créditos devueltos correctamente');
    } else {
      console.log(`⚠️ Diferencia: esperado ${creditosIniciales}, real ${userAfterCancel.credits}`);
    }
    
    // 10. Limpiar - eliminar booking de prueba
    console.log('\n📋 PASO 9: Limpiar datos de prueba...');
    await prisma.matchGameBooking.delete({
      where: { id: booking.id }
    });
    console.log('✅ Reserva de prueba eliminada');
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 PRUEBA COMPLETADA CON ÉXITO');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ ERROR EN LA PRUEBA:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testMatchBookingFlow();
