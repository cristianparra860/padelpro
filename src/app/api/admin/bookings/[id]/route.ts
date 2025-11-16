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

    // 🔍 VERIFICAR SI QUEDAN BOOKINGS ACTIVOS EN EL TIMESLOT
    const remainingBookings = await prisma.booking.count({
      where: {
        timeSlotId: existingBooking.timeSlotId,
        status: { in: ['PENDING', 'CONFIRMED'] }
      }
    });

    console.log(`📊 Bookings activos restantes en TimeSlot: ${remainingBookings}`);

    // 🔓 SI NO QUEDAN BOOKINGS, LIBERAR EL TIMESLOT
    if (remainingBookings === 0) {
      console.log('🔓 No quedan bookings activos - Liberando TimeSlot...');
      
      try {
        // Limpiar courtId del TimeSlot
        await prisma.timeSlot.update({
          where: { id: existingBooking.timeSlotId },
          data: {
            courtId: null,
            courtNumber: null,
            genderCategory: null
          }
        });
        console.log('✅ TimeSlot liberado (courtId limpiado)');

        // Limpiar schedules
        await prisma.courtSchedule.deleteMany({
          where: { timeSlotId: existingBooking.timeSlotId }
        });
        
        await prisma.instructorSchedule.deleteMany({
          where: { timeSlotId: existingBooking.timeSlotId }
        });
        
        console.log('✅ Schedules eliminados');
      } catch (cleanupError) {
        console.error('❌ Error limpiando TimeSlot:', cleanupError);
      }
    }

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