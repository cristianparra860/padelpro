// src/app/api/bookings/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * DELETE /api/bookings/[id]
 * Elimina permanentemente una reserva cancelada o de una clase pasada
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bookingId = params.id;

    if (!bookingId) {
      return NextResponse.json(
        { error: 'ID de reserva requerido' },
        { status: 400 }
      );
    }

    // Verificar que la reserva existe
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        status: true,
        timeSlotId: true,
        timeSlot: {
          select: {
            start: true,
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Reserva no encontrada' },
        { status: 404 }
      );
    }

    // Verificar que la reserva está cancelada O que la clase ya pasó
    const now = new Date();
    const classStart = new Date(booking.timeSlot.start);
    const isClassPast = classStart < now;
    const isCancelled = booking.status === 'CANCELLED';

    if (!isCancelled && !isClassPast) {
      return NextResponse.json(
        { error: 'Solo se pueden eliminar reservas canceladas o de clases finalizadas' },
        { status: 400 }
      );
    }

    // Eliminar la reserva permanentemente
    await prisma.booking.delete({
      where: { id: bookingId },
    });

    return NextResponse.json({
      success: true,
      message: 'Reserva eliminada correctamente',
    });
  } catch (error) {
    console.error('Error eliminando reserva:', error);
    return NextResponse.json(
      { error: 'Error del servidor al eliminar la reserva' },
      { status: 500 }
    );
  }
}
