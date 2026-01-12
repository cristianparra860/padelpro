// src/app/api/bookings/court-reservation/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Crear reserva directa de pista por un usuario
 * POST /api/bookings/court-reservation
 * Body: { clubId, courtId, start, end, userId, duration, totalPrice }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clubId, courtId, start, end, userId, duration, totalPrice } = body;

    // Validaciones
    if (!clubId || !start || !end || !userId || !duration || totalPrice === undefined) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    // Verificar que el usuario existe
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Verificar créditos suficientes
    const totalCredits = Number(user.credits) / 100; // Convertir de céntimos a euros
    if (totalCredits < totalPrice) {
      return NextResponse.json(
        {
          error: 'Créditos insuficientes',
          requiredCredits: totalPrice,
          availableCredits: totalCredits
        },
        { status: 400 }
      );
    }

    // Si se especifica courtId, verificar disponibilidad de esa pista específica
    if (courtId) {
      const courtConflicts = await prisma.$queryRaw`
        SELECT * FROM CourtSchedule
        WHERE courtId = ${courtId}
        AND (
          (startTime < ${endDate.getTime()} AND endTime > ${startDate.getTime()})
        )
        AND isOccupied = 1
      `;

      if (Array.isArray(courtConflicts) && courtConflicts.length > 0) {
        return NextResponse.json(
          { error: 'La pista seleccionada no está disponible en ese horario' },
          { status: 409 }
        );
      }
    } else {
      // Si no se especifica pista, buscar primera pista disponible
      const club = await prisma.club.findUnique({
        where: { id: clubId },
        include: { courts: true },
      });

      if (!club || !club.courts || club.courts.length === 0) {
        return NextResponse.json(
          { error: 'No hay pistas disponibles en este club' },
          { status: 404 }
        );
      }

      // Buscar primera pista disponible
      let availableCourt = null;
      for (const court of club.courts) {
        const conflicts = await prisma.$queryRaw`
          SELECT * FROM CourtSchedule
          WHERE courtId = ${court.id}
          AND (
            (startTime < ${endDate.getTime()} AND endTime > ${startDate.getTime()})
          )
          AND isOccupied = 1
        `;

        if (!Array.isArray(conflicts) || conflicts.length === 0) {
          availableCourt = court;
          break;
        }
      }

      if (!availableCourt) {
        return NextResponse.json(
          { error: 'No hay pistas disponibles en ese horario' },
          { status: 409 }
        );
      }

      // Asignar la pista encontrada
      body.courtId = availableCourt.id;
    }

    // Crear reserva en CourtSchedule
    const courtSchedule = await prisma.courtSchedule.create({
      data: {
        courtId: body.courtId,
        date: startDate,
        startTime: startDate,
        endTime: endDate,
        isOccupied: true,
        reason: `user_court_reservation:${userId}:${duration}min`,
      },
    });

    // Descontar créditos del usuario
    const chargeAmountCents = Math.round(totalPrice * 100); // Convertir a céntimos
    const newBalance = Number(user.credits) - chargeAmountCents;

    await prisma.user.update({
      where: { id: userId },
      data: { credits: newBalance },
    });

    // Registrar transacción
    const formattedDate = startDate.toLocaleString('es-ES', {
      timeZone: 'Europe/Madrid',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    await prisma.transaction.create({
      data: {
        userId,
        type: 'credit',
        action: 'subtract',
        amount: chargeAmountCents,
        balance: newBalance, // Balance en céntimos
        concept: `Reserva de pista ${formattedDate} - ${duration} minutos`,
        relatedId: courtSchedule.id,
        relatedType: 'court_reservation',
        createdAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      reservation: {
        id: courtSchedule.id,
        courtId: body.courtId,
        startTime: startDate,
        endTime: endDate,
        duration,
        totalPrice,
      },
    });
  } catch (error) {
    console.error('Error creating court reservation:', error);
    return NextResponse.json(
      {
        error: 'Error al crear la reserva',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
