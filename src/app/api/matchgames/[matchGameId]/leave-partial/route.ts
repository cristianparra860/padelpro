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
            end: true,
            courtNumber: true,
            pricePerPlayer: true,
            courtRentalPrice: true,
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

    // 🔍 DETECTAR SI ES RESERVA PRIVADA (1 booking con monto total >10€)
    const bookingCount = userBookings.length;
    const totalAmountBlocked = userBookings.reduce((sum, b) => sum + Number(b.amountBlocked || 0), 0);
    const isPrivateBooking = bookingCount === 1 && totalAmountBlocked > 1000;
    
    console.log(`📋 Bookings del usuario: ${bookingCount} encontrados`);
    console.log(`💰 Monto total bloqueado: €${(totalAmountBlocked / 100).toFixed(2)}`);
    console.log(`🏆 ¿Es reserva privada?: ${isPrivateBooking ? 'SÍ' : 'NO'}`);
    console.log(`♻️ Cediendo ${slotsToTransfer} plaza(s)`);

    // Para reservas privadas, validar que no intente ceder más de 4 plazas
    const maxSlotsAvailable = isPrivateBooking ? 4 : bookingCount;
    
    if (slotsToTransfer > maxSlotsAvailable) {
      return NextResponse.json(
        { error: `Solo puedes ceder hasta ${maxSlotsAvailable} plaza${maxSlotsAvailable > 1 ? 's' : ''}` },
        { status: 400 }
      );
    }
    
    const user = userBookings[0].user;
    const matchGame = userBookings[0].matchGame;
    
    // Calcular precio por plaza (para reservas privadas, dividir el total entre 4)
    const pricePerSlot = isPrivateBooking 
      ? (Number(matchGame.courtRentalPrice) || 0) / 4
      : Number(matchGame.pricePerPlayer) || 0;
    
    // Calcular puntos de compensación total
    let totalPointsGranted = 0;
    
    // Procesar en una transacción (con timeout extendido a 10s)
    await prisma.$transaction(async (tx) => {
      const isConfirmed = userBookings[0].status === 'CONFIRMED' && matchGame.courtNumber !== null;
      
      if (isPrivateBooking) {
        // ===== CASO: RESERVA PRIVADA (1 booking representa 4 plazas) =====
        console.log(`🏆 Procesando reserva privada - Ceder ${slotsToTransfer} de 4 plazas`);
        
        const originalBooking = userBookings[0];
        const pointsPerSlot = Math.floor(pricePerSlot);
        
        // Calcular puntos de compensación solo si está confirmada
        if (isConfirmed) {
          totalPointsGranted = pointsPerSlot * slotsToTransfer;
        }
        
        console.log(`  💰 Precio por plaza: €${pricePerSlot.toFixed(2)} → ${pointsPerSlot} pts`);
        console.log(`  🎁 Total puntos a otorgar: ${totalPointsGranted} pts`);
        
        // Si cede TODAS las plazas, simplemente marcar el booking como CANCELLED + isRecycled
        if (slotsToTransfer === 4) {
          console.log(`  ✅ Cediendo las 4 plazas - Cancelando booking original`);
          
          await tx.matchGameBooking.update({
            where: { id: originalBooking.id },
            data: {
              status: 'CANCELLED',
              isRecycled: isConfirmed,
              wasConfirmed: isConfirmed
            }
          });
          
          // Liberar pista si tenía
          if (matchGame.courtNumber) {
            console.log(`  🏟️ Liberando pista ${matchGame.courtNumber}`);
            await tx.matchGame.update({
              where: { id: matchGameId },
              data: { courtNumber: null }
            });
          }
        } else {
          // Si cede MENOS de 4 plazas, necesitamos reorganizar los bookings
          console.log(`  ✅ Cesión parcial - Reestructurando bookings`);
          
          const slotsRemaining = 4 - slotsToTransfer;
          const amountRemainingPerSlot = Math.round(pricePerSlot * 100);
          
          // 1. Cancelar el booking original (que representaba las 4 plazas)
          await tx.matchGameBooking.update({
            where: { id: originalBooking.id },
            data: {
              status: 'CANCELLED',
              isRecycled: false, // No es reciclado, simplemente se cancela para reestructurar
              wasConfirmed: false
            }
          });
          
          console.log(`  🗑️ Booking original cancelado (4 plazas)`);
          
          // 2. Crear N bookings reciclados para las plazas cedidas
          for (let i = 0; i < slotsToTransfer; i++) {
            await tx.matchGameBooking.create({
              data: {
                matchGameId: matchGameId,
                userId: userId,
                status: 'CANCELLED',
                isRecycled: isConfirmed,
                wasConfirmed: isConfirmed,
                amountBlocked: amountRemainingPerSlot, // Monto por plaza en céntimos
                createdAt: new Date()
              }
            });
          }
          
          console.log(`  ♻️ ${slotsToTransfer} booking(s) reciclado(s) creados`);
          
          // 3. Crear 1 nuevo booking activo para las plazas que mantiene el usuario
          await tx.matchGameBooking.create({
            data: {
              matchGameId: matchGameId,
              userId: userId,
              status: 'CONFIRMED',
              isRecycled: false,
              wasConfirmed: true,
              amountBlocked: amountRemainingPerSlot * slotsRemaining, // Monto proporcional a plazas restantes
              createdAt: new Date()
            }
          });
          
          console.log(`  ✅ Nuevo booking activo creado (${slotsRemaining} plazas restantes con €${((amountRemainingPerSlot * slotsRemaining) / 100).toFixed(2)} bloqueados)`);
          console.log(`  📊 Resultado final: ${slotsToTransfer} plazas recicladas + ${slotsRemaining} plazas activas = 4 plazas totales`);
        }
        
      } else {
        // ===== CASO: BOOKINGS INDIVIDUALES (múltiples bookings) =====
        console.log(`👥 Procesando bookings individuales - Ceder ${slotsToTransfer} plaza(s)`);
        
        const bookingsToTransfer = userBookings.slice(0, slotsToTransfer);
        
        for (const booking of bookingsToTransfer) {
          const pointsForThisSlot = Math.floor(pricePerSlot);
          
          console.log(`  🎫 Booking ${booking.id} - Status: ${booking.status} - €${pricePerSlot.toFixed(2)} → ${pointsForThisSlot} pts`);
          
          // Marcar como CANCELLED + isRecycled si está confirmado
          await tx.matchGameBooking.update({
            where: { id: booking.id },
            data: {
              status: 'CANCELLED',
              isRecycled: isConfirmed,
              wasConfirmed: isConfirmed
            }
          });

          if (isConfirmed) {
            totalPointsGranted += pointsForThisSlot;
          }
        }

        // Verificar si quedan bookings activos
        const remainingActiveBookings = matchGame.bookings.filter(
          (b: any) => !bookingsToTransfer.find(bt => bt.id === b.id)
        );

        // Si no quedan bookings activos y la partida tenía pista, liberar pista
        if (remainingActiveBookings.length === 0 && matchGame.courtNumber) {
          console.log(`  🏟️ No quedan bookings activos, liberando pista ${matchGame.courtNumber}`);
          await tx.matchGame.update({
            where: { id: matchGameId },
            data: { courtNumber: null }
          });
        }
      }

      // Otorgar puntos de compensación (solo si la partida estaba confirmada)
      if (totalPointsGranted > 0) {
        // Actualizar puntos del usuario directamente dentro de la transacción
        const updatedUser = await tx.user.update({
          where: { id: userId },
          data: {
            points: { increment: totalPointsGranted }
          },
          select: { points: true }
        });
        
        const newPoints = updatedUser.points;
        console.log(`✅ Otorgados ${totalPointsGranted} puntos de compensación. Total puntos usuario: ${newPoints}`);
        
        // Registrar transacción de puntos (también dentro de tx)
        await tx.transaction.create({
          data: {
            userId: userId,
            type: 'points',
            action: 'add',
            amount: totalPointsGranted,
            balance: newPoints,
            concept: `Cesión de ${slotsToTransfer} plaza${slotsToTransfer > 1 ? 's' : ''} - Partida ${new Date(matchGame.start).toLocaleString('es-ES')}`,
            relatedId: matchGameId,
            relatedType: 'matchGameBooking',
            metadata: JSON.stringify({
              matchGameId: matchGameId,
              slotsTransferred: slotsToTransfer,
              isPrivateBooking,
              pricePerSlot,
              reason: 'Cesión parcial de plazas en partida'
            })
          }
        });
      }
    }, {
      maxWait: 10000, // Esperar máximo 10 segundos por la transacción
      timeout: 10000  // Timeout de 10 segundos
    });

    console.log(`✅ Cesión parcial completada: ${slotsToTransfer} plaza(s) cedida(s)`);
    
    return NextResponse.json({
      success: true,
      slotsTransferred: slotsToTransfer,
      pointsGranted: totalPointsGranted,
      isPrivateBooking,
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
