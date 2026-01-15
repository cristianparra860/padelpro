import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { grantCompensationPoints } from '@/lib/blockedCredits';
import { createTransaction } from '@/lib/transactionLogger';

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

    // 🔍 DETERMINAR SI EL BOOKING ESTÁ CONFIRMADO (tiene courtId asignado)
    const isConfirmed = existingBooking.timeSlot?.courtId !== null;
    const totalPrice = Number(existingBooking.timeSlot?.totalPrice) || 55;
    const pricePerPerson = totalPrice / (Number(existingBooking.groupSize) || 1);

    console.log(`📋 Booking status: ${isConfirmed ? 'CONFIRMED (courtId assigned)' : 'PENDING'}`);

    let refundMessage = '';

    // 💰 PROCESAR REEMBOLSO SEGÚN EL ESTADO
    if (isConfirmed) {
      // ♻️ CANCELACIÓN DE RESERVA CONFIRMADA → Otorgar PUNTOS
      console.log(`🎁 Booking confirmado - Otorgando PUNTOS de compensación a ${existingBooking.user.name}`);

      const pointsGranted = Math.floor(pricePerPerson);
      const newPoints = await grantCompensationPoints(existingBooking.userId, pricePerPerson, true);

      console.log(`✅ Otorgados ${pointsGranted} puntos (de €${pricePerPerson.toFixed(2)}). Total puntos: ${newPoints}`);

      // Registrar transacción de puntos
      await createTransaction({
        userId: existingBooking.userId,
        type: 'points',
        action: 'add',
        amount: pointsGranted,
        balance: newPoints,
        concept: `Cancelación administrativa - Clase ${new Date(existingBooking.timeSlot?.start || Date.now()).toLocaleString('es-ES')}`,
        relatedId: bookingId,
        relatedType: 'booking',
        metadata: {
          timeSlotId: existingBooking.timeSlotId,
          groupSize: existingBooking.groupSize,
          reason: 'Cancelación desde panel de administración',
          originalAmount: pricePerPerson
        }
      });

      refundMessage = `${pointsGranted} puntos otorgados`;

    } else {
      // 💳 CANCELACIÓN DE RESERVA PENDIENTE → Solo DESBLOQUEAR CRÉDITOS
      console.log(`💰 Booking pendiente - Desbloqueando €${pricePerPerson.toFixed(2)} a ${existingBooking.user.name}`);

      // Solo decrementamos blockedCredits. NO tocamos credits (saldo real).
      await prisma.user.update({
        where: { id: existingBooking.userId },
        data: {
          blockedCredits: { decrement: pricePerPerson }
        }
      });

      console.log(`✅ Saldo bloqueado liberado: -€${pricePerPerson.toFixed(2)}`);

      refundMessage = `€${pricePerPerson.toFixed(2)} liberados (bloqueo)`;
    }

    // Marcar la reserva como CANCELADA y convertirla en plaza RECICLADA
    // Si era confirmada, se convierte en plaza reciclada (solo puntos)
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'CANCELLED',
        wasConfirmed: isConfirmed, // Recordar si tenía pista asignada
        isRecycled: isConfirmed // Si era confirmada, marcar como reciclada
      }
    });

    console.log(`✅ Booking marked as CANCELLED: ${bookingId}, wasConfirmed: ${isConfirmed}, isRecycled: ${isConfirmed}`);

    // ♻️ SI ERA CONFIRMADA, ya está marcada como reciclada (isRecycled=true)
    // El booking CANCELLED con isRecycled=true aparecerá en el panel principal como plaza reciclada
    if (isConfirmed) {
      console.log('♻️ Plaza marcada como reciclada: solo reservable con puntos');
    }

    // 🔍 VERIFICAR SI QUEDAN BOOKINGS ACTIVOS O PLAZAS RECICLADAS
    const remainingActiveBookings = await prisma.booking.count({
      where: {
        timeSlotId: existingBooking.timeSlotId,
        status: { in: ['PENDING', 'CONFIRMED'] }
      }
    });

    const recycledBookings = await prisma.booking.count({
      where: {
        timeSlotId: existingBooking.timeSlotId,
        status: 'CANCELLED',
        isRecycled: true
      }
    });

    const totalPlayers = Number(existingBooking.timeSlot?.maxPlayers) || 4;
    const occupiedSpots = remainingActiveBookings;
    const availableRecycledSpots = totalPlayers - occupiedSpots;

    console.log(`📊 Estado del TimeSlot:`);
    console.log(`   - Capacidad total: ${totalPlayers} jugadores`);
    console.log(`   - Reservas activas: ${remainingActiveBookings}`);
    console.log(`   - Plazas recicladas: ${recycledBookings}`);
    console.log(`   - Plazas disponibles para reciclar: ${availableRecycledSpots}`);

    // ♻️ LA PISTA SIEMPRE MANTIENE EL courtId MIENTRAS HAYA PLAZAS (activas o recicladas)
    // Solo se limpia si la clase queda completamente vacía
    if (remainingActiveBookings === 0 && recycledBookings === 0) {
      console.log('🔓 Clase completamente vacía - Liberando TimeSlot...');

      try {
        // Solo limpiar si no hay ningún booking (ni activo ni reciclado)
        await prisma.timeSlot.update({
          where: { id: existingBooking.timeSlotId },
          data: {
            courtId: null,
            courtNumber: null,
            genderCategory: null
          }
        });
        console.log('✅ TimeSlot liberado completamente');

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
    } else {
      console.log(`✅ Clase mantiene pista ${existingBooking.timeSlot?.courtNumber || 'asignada'}`);
      console.log(`   ♻️ Plaza liberada disponible SOLO CON PUNTOS en panel principal`);
    }

    console.log(`📋 Deleted booking details: User: ${existingBooking.user.name}, TimeSlot: ${existingBooking.timeSlotId}`);

    return NextResponse.json({
      success: true,
      message: `Reserva cancelada exitosamente. ${refundMessage}`,
      deletedBooking: {
        id: existingBooking.id,
        userName: existingBooking.user.name,
        timeSlotId: existingBooking.timeSlotId,
        groupSize: existingBooking.groupSize,
        wasConfirmed: isConfirmed,
        refund: refundMessage
      }
    });

  } catch (error) {
    console.error('❌ Error deleting booking:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al cancelar la reserva' },
      { status: 500 }
    );
  }
}