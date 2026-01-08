import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * PATCH /api/matchgames/bookings/[id]/hide
 * Oculta una reserva de partida del historial del usuario
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params;

    if (!bookingId) {
      return NextResponse.json(
        { error: 'ID de reserva requerido' },
        { status: 400 }
      );
    }

    // Actualizar la reserva de partida para ocultarla del historial
    const updatedBooking = await prisma.matchGameBooking.update({
      where: { id: bookingId },
      data: { hiddenFromHistory: true }
    });

    console.log(`✅ Reserva de partida ${bookingId} ocultada del historial`);

    return NextResponse.json({
      success: true,
      booking: updatedBooking
    });

  } catch (error) {
    console.error('❌ Error al ocultar reserva de partida:', error);
    return NextResponse.json(
      { error: 'Error al ocultar la reserva del historial' },
      { status: 500 }
    );
  }
}
