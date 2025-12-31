import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createTransaction } from '@/lib/transactionLogger';

export async function POST(
  request: Request,
  { params }: { params: { matchGameId: string } }
) {
  try {
    const { userId } = await request.json();
    const { matchGameId } = params;
    
    console.log('\n🚪 === LEAVING MATCH GAME ===');
    console.log('📝 Datos:', { matchGameId, userId });
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Falta userId' },
        { status: 400 }
      );
    }
    
    // Buscar el booking del usuario
    const booking = await prisma.matchGameBooking.findFirst({
      where: {
        matchGameId,
        userId,
        status: { in: ['PENDING', 'CONFIRMED'] }
      },
      include: {
        matchGame: {
          select: {
            id: true,
            start: true,
            courtNumber: true,
            bookings: {
              where: { status: { not: 'CANCELLED' } },
              select: { id: true, userId: true }
            }
          }
        }
      }
    });
    
    if (!booking) {
      return NextResponse.json(
        { error: 'No se encontró tu inscripción en esta partida' },
        { status: 404 }
      );
    }
    
    console.log(`📋 Booking encontrado: ${booking.id} - Status: ${booking.status}`);
    
    // Calcular tiempo restante hasta el inicio
    const now = new Date();
    const matchStart = new Date(booking.matchGame.start);
    const hoursUntilStart = (matchStart.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    console.log(`⏰ Horas hasta inicio: ${hoursUntilStart.toFixed(2)}`);
    
    // Determinar si hay reembolso de puntos
    const refundPoints = hoursUntilStart >= 2;
    
    // Cancelar el booking
    await prisma.matchGameBooking.update({
      where: { id: booking.id },
      data: { status: 'CANCELLED' }
    });
    
    console.log(`✅ Booking cancelado`);
    
    // Gestionar reembolso según método de pago y tiempo
    if (booking.status === 'CONFIRMED') {
      // Partida confirmada: reembolsar según tiempo restante
      if (booking.paidWithPoints) {
        if (refundPoints) {
          // Más de 2h: reembolso completo de puntos
          await prisma.user.update({
            where: { id: userId },
            data: { points: { increment: booking.pointsUsed } }
          });
          
          await createTransaction({
            userId,
            type: 'points',
            action: 'refund',
            amount: booking.pointsUsed,
            concept: `Reembolso por cancelación de partida ${matchGameId}`,
            relatedId: booking.id,
            relatedType: 'matchGameBooking'
          });
          
          console.log(`💰 Puntos reembolsados: ${booking.pointsUsed}`);
        } else {
          // Menos de 2h: NO reembolso de puntos (política)
          console.log(`❌ Sin reembolso de puntos (cancelación < 2h)`);
        }
      } else {
        // Créditos: SIEMPRE se reembolsan (ya cobrados)
        await prisma.user.update({
          where: { id: userId },
          data: { credits: { increment: booking.amountBlocked } }
        });
        
        await createTransaction({
          userId,
          type: 'credit',
          action: 'refund',
          amount: booking.amountBlocked,
          concept: `Reembolso por cancelación de partida ${matchGameId}`,
          relatedId: booking.id,
          relatedType: 'matchGameBooking'
        });
        
        console.log(`💰 Créditos reembolsados: ${booking.amountBlocked / 100}`);
      }
      
      // Si la partida estaba confirmada, desconfirmarla
      if (booking.matchGame.courtNumber) {
        console.log(`⚠️ Desconfirmando partida (pista ${booking.matchGame.courtNumber})`);
        
        await prisma.matchGame.update({
          where: { id: matchGameId },
          data: {
            courtId: null,
            courtNumber: null
          }
        });
        
        // Desconfirmar otros bookings (vuelven a PENDING)
        await prisma.matchGameBooking.updateMany({
          where: {
            matchGameId,
            status: 'CONFIRMED',
            id: { not: booking.id }
          },
          data: { status: 'PENDING' }
        });
        
        console.log(`✅ Otros jugadores devueltos a PENDING`);
      }
      
    } else {
      // Booking PENDING: solo desbloquear fondos
      if (booking.paidWithPoints) {
        await prisma.user.update({
          where: { id: userId },
          data: { blockedPoints: { decrement: booking.pointsUsed } }
        });
        
        await createTransaction({
          userId,
          type: 'points',
          action: 'unblock',
          amount: booking.pointsUsed,
          concept: `Desbloqueo por cancelación de partida ${matchGameId}`,
          relatedId: booking.id,
          relatedType: 'matchGameBooking'
        });
        
        console.log(`🔓 Puntos desbloqueados: ${booking.pointsUsed}`);
      } else {
        await prisma.user.update({
          where: { id: userId },
          data: { blockedCredits: { decrement: booking.amountBlocked } }
        });
        
        await createTransaction({
          userId,
          type: 'credit',
          action: 'unblock',
          amount: booking.amountBlocked,
          concept: `Desbloqueo por cancelación de partida ${matchGameId}`,
          relatedId: booking.id,
          relatedType: 'matchGameBooking'
        });
        
        console.log(`🔓 Créditos desbloqueados: ${booking.amountBlocked / 100}`);
      }
    }
    
    // Contar jugadores restantes
    const remainingPlayers = booking.matchGame.bookings.length - 1;
    
    return NextResponse.json({
      success: true,
      refunded: refundPoints || !booking.paidWithPoints,
      message: refundPoints || !booking.paidWithPoints
        ? 'Inscripción cancelada y fondos reembolsados'
        : 'Inscripción cancelada (sin reembolso de puntos por cancelación tardía)',
      remainingPlayers
    });
    
  } catch (error) {
    console.error('❌ Error en POST /api/matchgames/[matchGameId]/leave:', error);
    return NextResponse.json(
      { error: 'Error al abandonar la partida', details: (error as Error).message },
      { status: 500 }
    );
  }
}
