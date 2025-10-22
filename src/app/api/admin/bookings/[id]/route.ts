import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log(`🗑️ DELETE /api/admin/bookings/${id} - Starting...`);
    
    const bookingId = id;

    // Verificar que la reserva existe
    const existingBooking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: true,
        timeSlot: true
      }
    });

    if (!existingBooking) {
      console.log(`❌ Booking not found: ${bookingId}`);
      return NextResponse.json(
        { error: 'Reserva no encontrada' },
        { status: 404 }
      );
    }

    // 💰 CALCULAR REEMBOLSO
    const totalPrice = Number(existingBooking.timeSlot?.totalPrice) || 55;
    const pricePerPerson = totalPrice / (Number(existingBooking.groupSize) || 1);
    
    console.log(`💰 Reembolsando €${pricePerPerson.toFixed(2)} a ${existingBooking.user.name}`);

    // Actualizar saldo del usuario
    const currentCredits = Number(existingBooking.user.credits) || 0;
    const newCredits = currentCredits + pricePerPerson;
    
    await prisma.user.update({
      where: { id: existingBooking.userId },
      data: { credits: newCredits }
    });

    console.log(`✅ Saldo actualizado: €${currentCredits.toFixed(2)} → €${newCredits.toFixed(2)} (reembolso: +€${pricePerPerson.toFixed(2)})`);

    // Eliminar la reserva
    await prisma.booking.delete({
      where: { id: bookingId }
    });

    console.log(`✅ Booking deleted successfully: ${bookingId}`);
    console.log(`📋 Deleted booking details: User: ${existingBooking.user.name}, TimeSlot: ${existingBooking.timeSlotId}`);

    return NextResponse.json({
      success: true,
      message: 'Reserva cancelada exitosamente',
      deletedBooking: {
        id: existingBooking.id,
        userName: existingBooking.user.name,
        timeSlotId: existingBooking.timeSlotId,
        groupSize: existingBooking.groupSize
      }
    });

  } catch (error) {
    console.error('❌ Error deleting booking:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al cancelar la reserva' },
      { status: 500 }
    );  }
}