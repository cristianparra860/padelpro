// src/app/api/bookings/court-reservation/[reservationId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * DELETE /api/bookings/court-reservation/[reservationId]
 * Cancelar una reserva de pista y devolver créditos al usuario
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { reservationId: string } }
) {
  try {
    const reservationId = params.reservationId;

    if (!reservationId) {
      return NextResponse.json(
        { error: 'reservationId es requerido' },
        { status: 400 }
      );
    }

    // Buscar la reserva
    const reservation = await prisma.courtSchedule.findUnique({
      where: { id: reservationId },
    });

    if (!reservation) {
      return NextResponse.json(
        { error: 'Reserva no encontrada' },
        { status: 404 }
      );
    }

    // Extraer userId y duración del reason
    // Formato: "user_court_reservation:{userId}:{duration}min"
    const reasonMatch = reservation.reason?.match(/^user_court_reservation:([^:]+):(\d+)min$/);
    
    if (!reasonMatch) {
      return NextResponse.json(
        { error: 'Formato de reserva inválido' },
        { status: 400 }
      );
    }

    const userId = reasonMatch[1];
    const duration = parseInt(reasonMatch[2]);

    // Verificar que la reserva no haya pasado
    if (new Date(reservation.endTime) < new Date()) {
      return NextResponse.json(
        { error: 'No se puede cancelar una reserva pasada' },
        { status: 400 }
      );
    }

    // Buscar la transacción original para saber cuánto cobrar
    const originalTransaction = await prisma.transaction.findFirst({
      where: {
        userId,
        relatedId: reservationId,
        relatedType: 'court_reservation',
        action: 'subtract',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!originalTransaction) {
      return NextResponse.json(
        { error: 'No se encontró la transacción original' },
        { status: 404 }
      );
    }

    const refundAmount = originalTransaction.amount;
    const refundAmountCents = Math.round(refundAmount * 100);

    // Obtener usuario para actualizar créditos
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Devolver créditos al usuario
    const newBalance = Number(user.credits) + refundAmountCents;

    await prisma.user.update({
      where: { id: userId },
      data: { credits: newBalance },
    });

    // Registrar transacción de reembolso
    await prisma.transaction.create({
      data: {
        userId,
        type: 'credit',
        action: 'add',
        amount: refundAmount,
        balance: newBalance / 100,
        concept: `Reembolso por cancelación de reserva de pista - ${duration} minutos`,
        relatedId: reservationId,
        relatedType: 'court_reservation_refund',
        createdAt: new Date(),
      },
    });

    // Eliminar la reserva de CourtSchedule
    await prisma.courtSchedule.delete({
      where: { id: reservationId },
    });

    console.log(`✅ Reserva cancelada: ${reservationId}, reembolsados ${refundAmount}€ al usuario ${userId}`);

    return NextResponse.json({
      success: true,
      message: 'Reserva cancelada exitosamente',
      refundAmount,
      newBalance: newBalance / 100,
    });
  } catch (error) {
    console.error('❌ Error al cancelar reserva de pista:', error);
    return NextResponse.json(
      { 
        error: 'Error al cancelar la reserva',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
