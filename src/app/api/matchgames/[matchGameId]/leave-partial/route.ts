// src/app/api/matchgames/[matchGameId]/leave-partial/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createTransaction } from '@/lib/transactionLogger';
import { grantCompensationPoints } from '@/lib/blockedCredits';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ matchGameId: string }> }
) {
  try {
    const { userId, slotsToTransfer } = await request.json();
    const { matchGameId } = await params;
    
    console.log('\n🚪 === CESIÓN PARCIAL DE PLAZAS EN PARTIDA ===');
    console.log('📝 Datos:', { matchGameId, userId, slotsToTransfer });
    
    if (!userId || !slotsToTransfer) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos' },
        { status: 400 }
      );
    }

    if (slotsToTransfer < 1 || slotsToTransfer > 4) {
      return NextResponse.json(
        { error: 'El número de plazas debe ser entre 1 y 4' },
        { status: 400 }
      );
    }
    
    // Buscar todos los bookings del usuario en esta partida
    const userBookings = await prisma.matchGameBooking.findMany({
      where: {
        matchGameId,
        userId,
        status: { in: ['PENDING', 'CONFIRMED'] }
      },
      orderBy: { createdAt: 'asc' },
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

    if (userBookings.length === 0) {
      return NextResponse.json(
        { error: 'No tienes reservas en esta partida' },
        { status: 404 }
      );
    }

    if (slotsToTransfer > userBookings.length) {
      return NextResponse.json(
        { error: `Solo puedes ceder hasta ${userBookings.length} plaza${userBookings.length > 1 ? 's' : ''}` },
        { status: 400 }
      );
    }
    
    console.log(`📋 Bookings del usuario: ${userBookings.length} encontrados`);
    console.log(`♻️ Cediendo ${slotsToTransfer} plaza(s)`);
    
    const user = userBookings[0].user;
    const pricePerPlayer = Number(userBookings[0].matchGame.pricePerPlayer) || 0;
    
    // Calcular puntos de compensación total
    let totalPointsGranted = 0;
    const bookingsToTransfer = userBookings.slice(0, slotsToTransfer);
    
    // Procesar cada booking en una transacción
    await prisma.$transaction(async (tx) => {
      for (const booking of bookingsToTransfer) {
        const pointsForThisSlot = Math.floor(pricePerPlayer);
        
        console.log(`  🎫 Booking ${booking.id} - Status: ${booking.status} - €${pricePerPlayer.toFixed(2)} → ${pointsForThisSlot} pts`);
        
        // Determinar si es cesión (CONFIRMED) o cancelación (PENDING)
        const isConfirmed = booking.status === 'CONFIRMED' && booking.matchGame.courtNumber !== null;
        
        // Marcar como CANCELLED + isRecycled si está confirmado
        await tx.matchGameBooking.update({
          where: { id: booking.id },
          data: {
            status: 'CANCELLED',
            isRecycled: isConfirmed, // Solo marcar como reciclado si estaba confirmado
            wasConfirmed: isConfirmed
          }
        });

        if (isConfirmed) {
          totalPointsGranted += pointsForThisSlot;
        }
      }

      // Otorgar todos los puntos de compensación de una vez (solo para plazas confirmadas)
      if (totalPointsGranted > 0) {
        const newPoints = await grantCompensationPoints(userId, totalPointsGranted, true);
        
        console.log(`✅ Otorgados ${totalPointsGranted} puntos de compensación. Total puntos usuario: ${newPoints}`);
        
        // Registrar transacción de puntos
        await createTransaction({
          userId: userId,
          type: 'points',
          action: 'add',
          amount: totalPointsGranted,
          balance: newPoints,
          concept: `Cesión de ${slotsToTransfer} plaza${slotsToTransfer > 1 ? 's' : ''} - Partida ${new Date(userBookings[0].matchGame.start).toLocaleString('es-ES')}`,
          relatedId: matchGameId,
          relatedType: 'matchGameBooking',
          metadata: {
            matchGameId: matchGameId,
            slotsTransferred: slotsToTransfer,
            bookingIds: bookingsToTransfer.map(b => b.id),
            reason: 'Cesión parcial de plazas en partida'
          }
        });
      }

      // Verificar si quedan bookings activos o reciclados
      const remainingActiveBookings = userBookings[0].matchGame.bookings.filter(
        (b: any) => !bookingsToTransfer.find(bt => bt.id === b.id)
      );

      // Si no quedan bookings activos y la partida tenía pista, liberar pista
      if (remainingActiveBookings.length === 0 && userBookings[0].matchGame.courtNumber) {
        console.log(`🏟️ No quedan bookings activos, liberando pista ${userBookings[0].matchGame.courtNumber}`);
        await tx.matchGame.update({
          where: { id: matchGameId },
          data: { courtNumber: null }
        });
      }
    });

    console.log(`✅ Cesión parcial completada: ${slotsToTransfer} plaza(s) cedida(s)`);
    
    return NextResponse.json({
      success: true,
      slotsTransferred: slotsToTransfer,
      pointsGranted: totalPointsGranted,
      message: `${slotsToTransfer} plaza${slotsToTransfer > 1 ? 's' : ''} cedida${slotsToTransfer > 1 ? 's' : ''} exitosamente. Has recibido ${totalPointsGranted} puntos de compensación.`
    });
    
  } catch (error) {
    console.error('❌ Error en cesión parcial de partida:', error);
    return NextResponse.json(
      { 
        error: 'Error al ceder plazas',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
