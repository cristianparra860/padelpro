// src/app/api/timeslots/[id]/leave-partial/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createTransaction } from '@/lib/transactionLogger';
import { grantCompensationPoints } from '@/lib/blockedCredits';
import { calculateSlotPrice } from '@/lib/blockedCredits';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, slotsToTransfer } = await request.json();
    const { id: timeSlotId } = await params;
    
    console.log('\n🚪 === CESIÓN PARCIAL DE PLAZAS EN CLASE ===');
    console.log('📝 Datos:', { timeSlotId, userId, slotsToTransfer });
    
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
    
    // Buscar el timeslot con todos los bookings del usuario
    const timeSlot = await prisma.timeSlot.findUnique({
      where: { id: timeSlotId },
      select: {
        id: true,
        start: true,
        totalPrice: true,
        bookings: {
          where: {
            userId: userId,
            status: 'CONFIRMED'
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });
    
    if (!timeSlot) {
      return NextResponse.json(
        { error: 'No se encontró la clase' },
        { status: 404 }
      );
    }

    const userBookings = timeSlot.bookings;

    if (userBookings.length === 0) {
      return NextResponse.json(
        { error: 'No tienes reservas confirmadas en esta clase' },
        { status: 404 }
      );
    }

    if (slotsToTransfer > userBookings.length) {
      return NextResponse.json(
        { error: `Solo puedes ceder hasta ${userBookings.length} plaza${userBookings.length > 1 ? 's' : ''}` },
        { status: 400 }
      );
    }
    
    console.log(`📋 Bookings del usuario: ${userBookings.length} confirmados`);
    console.log(`♻️ Cediendo ${slotsToTransfer} plaza(s)`);
    
    // Obtener el usuario para verificar saldo actual
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        credits: true,
        points: true,
        blockedCredits: true,
        blockedPoints: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Calcular puntos de compensación total
    let totalPointsGranted = 0;
    const bookingsToTransfer = userBookings.slice(0, slotsToTransfer);
    
    // Procesar cada booking en una transacción
    await prisma.$transaction(async (tx) => {
      for (const booking of bookingsToTransfer) {
        // Calcular el precio de esa plaza específica
        const slotPrice = calculateSlotPrice(Number(timeSlot.totalPrice), booking.groupSize);
        const pointsForThisSlot = Math.floor(slotPrice);
        
        console.log(`  🎫 Booking ${booking.id} - groupSize: ${booking.groupSize} - €${slotPrice.toFixed(2)} → ${pointsForThisSlot} pts`);
        
        // Marcar como CANCELLED + isRecycled
        await tx.booking.update({
          where: { id: booking.id },
          data: {
            status: 'CANCELLED',
            isRecycled: true,
            wasConfirmed: true
          }
        });

        totalPointsGranted += pointsForThisSlot;
      }

      // Otorgar todos los puntos de compensación de una vez
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
          concept: `Cesión de ${slotsToTransfer} plaza${slotsToTransfer > 1 ? 's' : ''} - Clase ${new Date(timeSlot.start).toLocaleString('es-ES')}`,
          relatedId: timeSlotId,
          relatedType: 'timeSlot',
          metadata: {
            timeSlotId: timeSlotId,
            slotsTransferred: slotsToTransfer,
            bookingIds: bookingsToTransfer.map(b => b.id),
            reason: 'Cesión parcial de plazas'
          }
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
    console.error('❌ Error en cesión parcial:', error);
    return NextResponse.json(
      { 
        error: 'Error al ceder plazas',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
