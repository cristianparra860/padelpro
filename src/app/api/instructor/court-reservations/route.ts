// src/app/api/instructor/court-reservations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

// POST - Crear nueva reserva de pista del instructor
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const body = await request.json();
    const { instructorId, courtId, startTime, duration, label } = body;

    // Validaciones
    if (!instructorId || !courtId || !startTime || !duration || !label) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    // Verificar que el usuario sea el instructor
    const instructor = await prisma.instructor.findUnique({
      where: { id: instructorId },
      include: { user: true },
    });

    if (!instructor || instructor.userId !== decoded.userId) {
      return NextResponse.json(
        { error: 'No tienes permisos para hacer esta reserva' },
        { status: 403 }
      );
    }

    // Calcular endTime basado en duración
    const startDateTime = new Date(startTime);
    const endDateTime = new Date(startDateTime.getTime() + duration * 60 * 1000);

    // Verificar que la pista esté disponible en ese horario
    const existingReservations = await prisma.$queryRaw`
      SELECT * FROM CourtSchedule
      WHERE courtId = ${courtId}
      AND (
        (startTime < ${endDateTime.getTime()} AND endTime > ${startDateTime.getTime()})
      )
      AND isOccupied = 1
    `;

    if (Array.isArray(existingReservations) && existingReservations.length > 0) {
      return NextResponse.json(
        { error: 'La pista ya está ocupada en ese horario' },
        { status: 409 }
      );
    }

    // Verificar que el instructor esté disponible en ese horario
    const instructorBusy = await prisma.$queryRaw`
      SELECT * FROM InstructorSchedule
      WHERE instructorId = ${instructorId}
      AND (
        (startTime < ${endDateTime.getTime()} AND endTime > ${startDateTime.getTime()})
      )
      AND isOccupied = 1
    `;

    if (Array.isArray(instructorBusy) && instructorBusy.length > 0) {
      return NextResponse.json(
        { error: 'Ya tienes una clase programada en ese horario' },
        { status: 409 }
      );
    }

    // Crear la reserva en CourtSchedule
    const courtReservation = await prisma.courtSchedule.create({
      data: {
        courtId,
        date: startDateTime,
        startTime: startDateTime,
        endTime: endDateTime,
        isOccupied: true,
        reason: `instructor_reservation:${instructorId}:${label}`, // Formato especial para identificar reservas de instructor
      },
    });

    // Crear también en InstructorSchedule para bloquear el horario del instructor
    const instructorReservation = await prisma.instructorSchedule.create({
      data: {
        instructorId,
        date: startDateTime,
        startTime: startDateTime,
        endTime: endDateTime,
        isOccupied: true,
        reason: `court_reservation:${courtReservation.id}:${label}`,
      },
    });

    return NextResponse.json({
      success: true,
      reservation: {
        id: courtReservation.id,
        courtId,
        instructorId,
        startTime: startDateTime,
        endTime: endDateTime,
        duration,
        label,
      },
    });
  } catch (error) {
    console.error('Error creating instructor court reservation:', error);
    return NextResponse.json(
      { error: 'Error al crear la reserva' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar reserva existente
export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const body = await request.json();
    const { id, instructorId, courtId, startTime, duration, label } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID de reserva requerido' }, { status: 400 });
    }

    // Verificar que el usuario sea el instructor
    const instructor = await prisma.instructor.findUnique({
      where: { id: instructorId },
      include: { user: true },
    });

    if (!instructor || instructor.userId !== decoded.userId) {
      return NextResponse.json(
        { error: 'No tienes permisos para editar esta reserva' },
        { status: 403 }
      );
    }

    // Buscar la reserva existente
    const existingReservation = await prisma.courtSchedule.findUnique({
      where: { id },
    });

    if (!existingReservation) {
      return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 });
    }

    // Verificar que sea una reserva de instructor
    if (!existingReservation.reason?.startsWith('instructor_reservation:')) {
      return NextResponse.json(
        { error: 'Esta no es una reserva de instructor' },
        { status: 403 }
      );
    }

    // Calcular nuevos tiempos
    const startDateTime = new Date(startTime);
    const endDateTime = new Date(startDateTime.getTime() + duration * 60 * 1000);

    // Verificar disponibilidad (excluyendo la reserva actual)
    const conflicts = await prisma.$queryRaw`
      SELECT * FROM CourtSchedule
      WHERE courtId = ${courtId}
      AND id != ${id}
      AND (
        (startTime < ${endDateTime.getTime()} AND endTime > ${startDateTime.getTime()})
      )
      AND isOccupied = 1
    `;

    if (Array.isArray(conflicts) && conflicts.length > 0) {
      return NextResponse.json(
        { error: 'La pista ya está ocupada en ese horario' },
        { status: 409 }
      );
    }

    // Actualizar CourtSchedule
    const updatedReservation = await prisma.courtSchedule.update({
      where: { id },
      data: {
        startTime: startDateTime,
        endTime: endDateTime,
        reason: `instructor_reservation:${instructorId}:${label}`,
      },
    });

    // Actualizar InstructorSchedule correspondiente
    const instructorSchedules = await prisma.$queryRaw<any[]>`
      SELECT * FROM InstructorSchedule
      WHERE reason LIKE ${'court_reservation:' + id + ':%'}
      AND instructorId = ${instructorId}
    `;

    if (instructorSchedules.length > 0) {
      await prisma.instructorSchedule.update({
        where: { id: instructorSchedules[0].id },
        data: {
          startTime: startDateTime,
          endTime: endDateTime,
          reason: `court_reservation:${id}:${label}`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      reservation: {
        id: updatedReservation.id,
        courtId,
        instructorId,
        startTime: startDateTime,
        endTime: endDateTime,
        duration,
        label,
      },
    });
  } catch (error) {
    console.error('Error updating instructor court reservation:', error);
    return NextResponse.json(
      { error: 'Error al actualizar la reserva' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar reserva
export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID de reserva requerido' }, { status: 400 });
    }

    // Buscar la reserva
    const reservation = await prisma.courtSchedule.findUnique({
      where: { id },
    });

    if (!reservation) {
      return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 });
    }

    // Verificar que sea una reserva de instructor
    if (!reservation.reason?.startsWith('instructor_reservation:')) {
      return NextResponse.json(
        { error: 'Esta no es una reserva de instructor' },
        { status: 403 }
      );
    }

    // Extraer instructorId del reason
    const instructorId = reservation.reason.split(':')[1];

    // Verificar permisos
    const instructor = await prisma.instructor.findUnique({
      where: { id: instructorId },
      include: { user: true },
    });

    if (!instructor || instructor.userId !== decoded.userId) {
      return NextResponse.json(
        { error: 'No tienes permisos para eliminar esta reserva' },
        { status: 403 }
      );
    }

    // Eliminar InstructorSchedule relacionado
    await prisma.$executeRaw`
      DELETE FROM InstructorSchedule
      WHERE reason LIKE ${'court_reservation:' + id + ':%'}
      AND instructorId = ${instructorId}
    `;

    // Eliminar CourtSchedule
    await prisma.courtSchedule.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Reserva eliminada correctamente',
    });
  } catch (error) {
    console.error('Error deleting instructor court reservation:', error);
    return NextResponse.json(
      { error: 'Error al eliminar la reserva' },
      { status: 500 }
    );
  }
}

// GET - Obtener reservas del instructor o de todos los instructores de un club
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const instructorId = searchParams.get('instructorId');
    const clubId = searchParams.get('clubId');
    const date = searchParams.get('date');

    // Se requiere instructorId O clubId
    if (!instructorId && !clubId) {
      return NextResponse.json(
        { error: 'instructorId o clubId es requerido' },
        { status: 400 }
      );
    }

    let whereClause = '';
    
    if (clubId) {
      // Si se pasa clubId, obtener TODAS las reservas de instructores de ese club
      // Primero obtener todos los instructores del club
      const instructors = await prisma.instructor.findMany({
        where: { clubId, isActive: true },
        select: { id: true }
      });
      
      const instructorIds = instructors.map(i => i.id);
      
      if (instructorIds.length === 0) {
        return NextResponse.json({
          success: true,
          reservations: [],
        });
      }
      
      // Construir condición para TODAS las reservas de estos instructores
      const instructorConditions = instructorIds.map(id => `reason LIKE 'instructor_reservation:${id}:%'`).join(' OR ');
      whereClause = `WHERE (${instructorConditions})`;
    } else if (instructorId) {
      // Si se pasa instructorId, filtrar solo por ese instructor
      whereClause = `WHERE reason LIKE 'instructor_reservation:${instructorId}:%'`;
    }

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      whereClause += ` AND startTime >= ${startOfDay.getTime()} AND startTime <= ${endOfDay.getTime()}`;
    }

    const reservations = await prisma.$queryRawUnsafe(`
      SELECT * FROM CourtSchedule
      ${whereClause}
      ORDER BY startTime ASC
    `);

    // Obtener TODOS los instructorIds únicos de las reservas
    const instructorIds = Array.isArray(reservations)
      ? [...new Set(reservations.map((r: any) => {
          const reasonParts = r.reason?.split(':') || [];
          return reasonParts[1];
        }).filter(Boolean))]
      : [];

    // Hacer UNA SOLA consulta para obtener todos los nombres de instructores
    const instructors = instructorIds.length > 0
      ? await prisma.instructor.findMany({
          where: { id: { in: instructorIds } },
          select: {
            id: true,
            user: {
              select: {
                name: true
              }
            }
          }
        })
      : [];

    // Crear un mapa para acceso rápido
    const instructorMap = new Map(
      instructors.map(i => [i.id, i.user.name])
    );

    // Parsear las reservas usando el mapa (sin await adicionales)
    const parsedReservations = Array.isArray(reservations)
      ? reservations.map((r: any) => {
          const reasonParts = r.reason?.split(':') || [];
          const reservationInstructorId = reasonParts[1];
          const label = reasonParts[2] || 'Reserva';
          const duration = Math.round(
            (new Date(r.endTime).getTime() - new Date(r.startTime).getTime()) / (1000 * 60)
          );

          const instructorName = instructorMap.get(reservationInstructorId) || 'Instructor';

          return {
            id: r.id,
            courtId: r.courtId,
            instructorId: reservationInstructorId,
            instructorName,
            startTime: new Date(r.startTime),
            endTime: new Date(r.endTime),
            duration,
            label,
          };
        })
      : [];

    return NextResponse.json({
      success: true,
      reservations: parsedReservations,
    });
  } catch (error) {
    console.error('Error fetching instructor reservations:', error);
    return NextResponse.json(
      { error: 'Error al obtener las reservas' },
      { status: 500 }
    );
  }
}
