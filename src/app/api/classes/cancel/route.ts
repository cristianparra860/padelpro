// src/app/api/classes/cancel/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId, userId, timeSlotId } = body;

    console.log('🗑️ Solicitud de cancelación:', { bookingId, userId, timeSlotId });

    // Verificar que tenemos los datos necesarios
    if (!userId || !timeSlotId) {
      return NextResponse.json({ 
        error: 'Faltan datos requeridos: userId y timeSlotId' 
      }, { status: 400 });
    }

    // Buscar la reserva del usuario para esta clase
    const booking = await prisma.booking.findFirst({
      where: {
        userId: userId,
        timeSlotId: timeSlotId,
      }
    });

    if (!booking) {
      return NextResponse.json({ 
        error: 'No se encontró la reserva para cancelar' 
      }, { status: 404 });
    }

    console.log('📍 Reserva encontrada:', booking.id);

    // 1️⃣ Obtener información del TimeSlot para reembolso
    const timeSlotInfo = await prisma.timeSlot.findUnique({
      where: { id: timeSlotId },
      select: {
        totalPrice: true,
        courtId: true,
        courtNumber: true,
        start: true,
        end: true,
        instructorId: true
      }
    });

    if (!timeSlotInfo) {
      return NextResponse.json({ 
        error: 'No se encontró información de la clase' 
      }, { status: 404 });
    }

    const pricePerPerson = timeSlotInfo.totalPrice / 4; // Precio dividido entre 4 jugadores máximo
    
    // 2️⃣ Reembolsar créditos al usuario
    console.log(`💰 Reembolsando €${pricePerPerson.toFixed(2)} al usuario ${userId}`);
    await prisma.user.update({
      where: { id: userId },
      data: {
        credits: {
          increment: pricePerPerson
        }
      }
    });

    // 3️⃣ Eliminar la reserva
    await prisma.booking.delete({
      where: {
        id: booking.id
      }
    });

    console.log('✅ Reserva eliminada');

    // 4️⃣ Verificar si quedan otras reservas para esta clase
    const remainingBookings = await prisma.booking.count({
      where: {
        timeSlotId: timeSlotId,
        status: { in: ['PENDING', 'CONFIRMED'] }
      }
    });

    console.log(`📊 Reservas restantes para esta clase: ${remainingBookings}`);

    // 5️⃣ Si no quedan reservas y la clase estaba confirmada, revertir a propuesta
    if (remainingBookings === 0 && timeSlotInfo.courtId) {
      console.log('🔄 No quedan reservas. Revirtiendo clase a propuesta...');
      
      // Quitar la pista asignada
      await prisma.timeSlot.update({
        where: { id: timeSlotId },
        data: {
          courtId: null,
          courtNumber: null,
          updatedAt: new Date()
        }
      });

      // Regenerar las propuestas eliminadas (para los 30 min siguientes)
      // Solo si tenemos instructor
      if (timeSlotInfo.instructorId) {
        const start = new Date(timeSlotInfo.start);
        const end = new Date(timeSlotInfo.end);
        
        // Crear propuesta para el slot actual
        const slotsToCreate = [];
        
        // Slot actual (ej: 10:00)
        slotsToCreate.push({
          clubId: 'club-1',
          instructorId: timeSlotInfo.instructorId,
          courtId: null,
          courtNumber: null,
          start: start,
          end: new Date(start.getTime() + 90 * 60 * 1000),
          maxPlayers: 4,
          totalPrice: 25.0,
          level: 'INTERMEDIATE',
          category: 'ADULTS'
        });

        // Slot siguiente (+30 min, ej: 10:30)
        const nextSlotStart = new Date(start.getTime() + 30 * 60 * 1000);
        slotsToCreate.push({
          clubId: 'club-1',
          instructorId: timeSlotInfo.instructorId,
          courtId: null,
          courtNumber: null,
          start: nextSlotStart,
          end: new Date(nextSlotStart.getTime() + 90 * 60 * 1000),
          maxPlayers: 4,
          totalPrice: 25.0,
          level: 'INTERMEDIATE',
          category: 'ADULTS'
        });

        // Insertar propuestas
        await prisma.timeSlot.createMany({
          data: slotsToCreate,
          skipDuplicates: true
        });

        console.log(`✅ Regeneradas ${slotsToCreate.length} propuestas`);
      }

      console.log('✅ Clase revertida a propuesta');
    }

    console.log('✅ Cancelación completada exitosamente');

    return NextResponse.json({ 
      success: true,
      message: 'Reserva cancelada y créditos reembolsados',
      cancelledBookingId: booking.id,
      refundedAmount: pricePerPerson,
      classReverted: remainingBookings === 0 && timeSlotInfo.courtId !== null
    });

  } catch (error) {
    console.error('❌ Error cancelando reserva:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor al cancelar la reserva' 
    }, { status: 500 });  }
}