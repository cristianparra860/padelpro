import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createTransaction } from '@/lib/transactionLogger';
import { grantCompensationPoints } from '@/lib/blockedCredits';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ matchGameId: string }> }
) {
  try {
    const { userId } = await request.json();
    const { matchGameId } = await params;
    
    console.log('\n🚪 === CESIÓN DE PLAZA EN PARTIDA ===');
    console.log('📝 Datos:', { matchGameId, userId });
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Falta userId' },
        { status: 400 }
      );
    }
    
    // Buscar TODOS los bookings activos del usuario en esta partida
    const userBookings = await prisma.matchGameBooking.findMany({
      where: {
        matchGameId,
        userId,
        status: { in: ['PENDING', 'CONFIRMED'] }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            credits: true,
            points: true,
            blockedCredits: true,
            blockedPoints: true
          }
        },
        matchGame: {
          select: {
            id: true,
            start: true,
            courtNumber: true,
            pricePerPlayer: true,
            bookings: {
              where: { status: { not: 'CANCELLED' } },
              select: { id: true, userId: true, status: true }
            }
          }
        }
      }
    });
    
    if (!userBookings || userBookings.length === 0) {
      return NextResponse.json(
        { error: 'No se encontró tu inscripción en esta partida' },
        { status: 404 }
      );
    }
    
    const bookingCount = userBookings.length;
    const booking = userBookings[0]; // Para obtener info de la partida
    
    console.log(`📋 Bookings del usuario encontrados: ${bookingCount}`);
    console.log(`📋 IDs: ${userBookings.map(b => b.id).join(', ')}`);
    console.log(`📋 Status: ${userBookings.map(b => b.status).join(', ')}`);
    console.log(`📋 Amount blocked: ${userBookings.map(b => b.amountBlocked).join(', ')}`);
    
    // 🔍 DETERMINAR SI ES RESERVA PRIVADA (1 booking con monto total) O MÚLTIPLES BOOKINGS
    const totalAmountBlocked = userBookings.reduce((sum, b) => sum + Number(b.amountBlocked || 0), 0);
    const isPrivateBooking = bookingCount === 1 && totalAmountBlocked > 1000; // >10€ indica reserva completa
    const isConfirmed = booking.status === 'CONFIRMED' && booking.matchGame.courtNumber !== null;
    
    console.log(`🏆 ¿Es reserva privada?: ${isPrivateBooking ? 'SÍ' : 'NO'}`);
    console.log(`📊 Estado: ${isConfirmed ? 'CONFIRMADA (cesión de plaza)' : 'PENDIENTE (cancelación simple)'}`);
    
    // Para reservas privadas, calcular según el monto total bloqueado
    // Para múltiples bookings, calcular por precio por jugador
    const pricePerPlayer = Number(booking.matchGame.pricePerPlayer) || 0;
    let totalAmount: number;
    let slotsCount: number;
    
    if (isPrivateBooking) {
      // Reserva privada: usar monto bloqueado total y calcular plazas
      totalAmount = totalAmountBlocked / 100; // Convertir de céntimos a euros
      slotsCount = 4; // Reserva privada siempre son 4 plazas
      console.log(`💰 Reserva privada - Monto total: €${totalAmount} (${slotsCount} plazas)`);
    } else {
      // Bookings individuales: calcular por precio por jugador
      totalAmount = pricePerPlayer * bookingCount;
      slotsCount = bookingCount;
      console.log(`💰 Precio por jugador: €${pricePerPlayer}`);
      console.log(`💰 Total a devolver (${slotsCount} plazas): €${totalAmount}`);
    }
    
    let refundMessage = '';
    let totalPointsGranted = 0;
    let totalCreditsUnblocked = 0;
    let totalPointsUnblocked = 0;
    
    if (isConfirmed) {
      // ♻️ CESIÓN DE PLAZA → Otorgar PUNTOS de compensación (1 punto por euro) POR TODAS LAS PLAZAS
      console.log(`♻️ Partida confirmada - Cediendo ${slotsCount} plaza(s) y otorgando PUNTOS`);
      
      totalPointsGranted = Math.floor(totalAmount);
      const newPoints = await grantCompensationPoints(userId, totalAmount, true);
      
      console.log(`✅ Otorgados ${totalPointsGranted} puntos (de €${totalAmount.toFixed(2)}). Total puntos: ${newPoints}`);
      
      // Registrar transacción de puntos (una sola por todas las plazas)
      await createTransaction({
        userId: userId,
        type: 'points',
        action: 'add',
        amount: totalPointsGranted,
        balance: newPoints,
        concept: `Cesión de ${slotsCount} plaza(s) - Partida ${new Date(booking.matchGame.start).toLocaleString('es-ES')}`,
        relatedId: matchGameId,
        relatedType: 'matchGame',
        metadata: {
          matchGameId: matchGameId,
          bookingIds: userBookings.map(b => b.id),
          slotsCount: slotsCount,
          isPrivateBooking: isPrivateBooking,
          reason: `Cesión de ${slotsCount} plaza(s) confirmada(s)`,
          originalAmount: totalAmount
        }
      });
      
      // ♻️ MARCAR TODAS LAS PLAZAS COMO RECICLADAS
      for (const userBooking of userBookings) {
        await prisma.matchGameBooking.update({
          where: { id: userBooking.id },
          data: { 
            status: 'CANCELLED',
            wasConfirmed: true,
            isRecycled: true
          }
        });
      }
      
      console.log(`♻️ ${slotsCount} plaza(s) marcada(s) como RECICLADA(S): solo reservables con puntos`);
      console.log(`🏟️ Partida mantiene pista ${booking.matchGame.courtNumber} asignada`);
      
      refundMessage = `${totalPointsGranted} puntos otorgados. ${slotsCount} plaza(s) cedida(s) disponible(s) para otros jugadores (solo puntos)`;
      
    } else {
      // 💳 CANCELACIÓN DE INSCRIPCIÓN PENDIENTE → Desbloquear fondos DE TODAS LAS PLAZAS
      console.log(`💰 Inscripción pendiente - Desbloqueando fondos de ${slotsCount} plaza(s)`);

      // Calcular totales a desbloquear
      for (const userBooking of userBookings) {
        if (userBooking.paidWithPoints) {
          totalPointsUnblocked += userBooking.pointsUsed;
        } else {
          totalCreditsUnblocked += userBooking.amountBlocked;
        }
      }

      if (totalPointsUnblocked > 0) {
        // Desbloquear puntos
        await prisma.user.update({
          where: { id: userId },
          data: { blockedPoints: { decrement: totalPointsUnblocked } }
        });
        
        await createTransaction({
          userId,
          type: 'points',
          action: 'unblock',
          amount: totalPointsUnblocked,
          concept: `Cancelación de ${slotsCount} inscripción(es) - Partida ${new Date(booking.matchGame.start).toLocaleString('es-ES')}`,
          relatedId: matchGameId,
          relatedType: 'matchGame',
          metadata: {
            matchGameId: matchGameId,
            bookingIds: userBookings.map(b => b.id),
            slotsCount: slotsCount,
            isPrivateBooking: isPrivateBooking
          }
        });
        
        console.log(`🔓 Puntos desbloqueados: ${totalPointsUnblocked}`);
        refundMessage = `${totalPointsUnblocked} puntos desbloqueados`;
        
      }
      
      if (totalCreditsUnblocked > 0) {
        // Desbloquear créditos
        const creditsInEuros = totalCreditsUnblocked / 100;
        await prisma.user.update({
          where: { id: userId },
          data: { blockedCredits: { decrement: totalCreditsUnblocked } }
        });
        
        await createTransaction({
          userId,
          type: 'credit',
          action: 'unblock',
          amount: totalCreditsUnblocked,
          concept: `Cancelación de ${slotsCount} inscripción(es) - Partida ${new Date(booking.matchGame.start).toLocaleString('es-ES')}`,
          relatedId: matchGameId,
          relatedType: 'matchGame',
          metadata: {
            matchGameId: matchGameId,
            bookingIds: userBookings.map(b => b.id),
            slotsCount: slotsCount,
            isPrivateBooking: isPrivateBooking
          }
        });
        
        console.log(`🔓 Créditos desbloqueados: €${(totalCreditsUnblocked / 100).toFixed(2)}`);
        refundMessage = `€${(totalCreditsUnblocked / 100).toFixed(2)} desbloqueados`;
      }
      
      // Marcar TODOS los bookings como cancelados (sin reciclar porque no estaban confirmados)
      for (const userBooking of userBookings) {
        await prisma.matchGameBooking.update({
          where: { id: userBooking.id },
          data: { 
            status: 'CANCELLED',
            wasConfirmed: false,
            isRecycled: false
          }
        });
      }
      
      console.log(`✅ ${slotsCount} inscripción(es) cancelada(s) (no eran confirmadas)`);
    }
    
    // 🔍 VERIFICAR SI QUEDAN PLAZAS ACTIVAS O RECICLADAS
    const remainingActiveBookings = await prisma.matchGameBooking.count({
      where: {
        matchGameId,
        status: { in: ['PENDING', 'CONFIRMED'] }
      }
    });

    const recycledBookings = await prisma.matchGameBooking.count({
      where: {
        matchGameId,
        status: 'CANCELLED',
        isRecycled: true
      }
    });
    
    const totalPlayers = 4; // Las partidas siempre son de 4 jugadores
    const occupiedSpots = remainingActiveBookings;
    const availableRecycledSpots = totalPlayers - occupiedSpots;

    console.log(`📊 Estado de la partida:`);
    console.log(`   - Capacidad total: ${totalPlayers} jugadores`);
    console.log(`   - Inscripciones activas: ${remainingActiveBookings}`);
    console.log(`   - Plazas recicladas: ${recycledBookings}`);
    console.log(`   - Plazas disponibles para reciclar: ${availableRecycledSpots}`);

    // ♻️ LA PISTA SIEMPRE MANTIENE EL courtNumber MIENTRAS HAYA PLAZAS (activas o recicladas)
    // Solo se libera si la partida queda completamente vacía
    if (remainingActiveBookings === 0 && recycledBookings === 0) {
      console.log('🔓 Partida completamente vacía - Liberando MatchGame...');
      
      try {
        await prisma.matchGame.update({
          where: { id: matchGameId },
          data: {
            courtId: null,
            courtNumber: null
          }
        });
        console.log('✅ MatchGame liberado completamente');
      } catch (cleanupError) {
        console.error('❌ Error limpiando MatchGame:', cleanupError);
      }
    } else {
      console.log(`✅ Partida mantiene pista ${booking.matchGame.courtNumber || 'asignada'}`);
      if (recycledBookings > 0) {
        console.log(`   ♻️ ${recycledBookings} plaza(s) reciclada(s) disponible(s) SOLO CON PUNTOS`);
      }
    }
    
    return NextResponse.json({
      success: true,
      refunded: true,
      isRecycled: isConfirmed,
      message: refundMessage,
      remainingPlayers: remainingActiveBookings,
      recycledSlots: recycledBookings,
      slotsProcessed: slotsCount,
      isPrivateBooking: isPrivateBooking,
      pointsGranted: totalPointsGranted,
      creditsUnblocked: totalCreditsUnblocked,
      pointsUnblocked: totalPointsUnblocked
    });
    
  } catch (error) {
    console.error('❌ Error en POST /api/matchgames/[matchGameId]/leave:', error);
    return NextResponse.json(
      { error: 'Error al ceder/cancelar la plaza', details: (error as Error).message },
      { status: 500 }
    );
  }
}
