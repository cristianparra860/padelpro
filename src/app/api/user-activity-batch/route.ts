// src/app/api/user-activity-batch/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate'); // YYYY-MM-DD
    const endDate = searchParams.get('endDate'); // YYYY-MM-DD

    if (!userId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'userId, startDate, and endDate are required' },
        { status: 400 }
      );
    }

    console.log('🔍 Batch checking activity from', startDate, 'to', endDate, 'for user', userId);

    // Convertir fechas a timestamps (milisegundos desde epoch)
    const startTimestamp = new Date(startDate + 'T00:00:00.000Z').getTime();
    const endTimestamp = new Date(endDate + 'T23:59:59.999Z').getTime();
    
    console.log('📅 Timestamps:', { startTimestamp, endTimestamp });

    // Una sola query para obtener todas las reservas en el rango de fechas
    const classBookings = await prisma.$queryRaw`
      SELECT 
        b.id,
        b.status,
        b.userId,
        ts.start,
        ts.end,
        ts.courtNumber
      FROM Booking b
      JOIN TimeSlot ts ON b.timeSlotId = ts.id
      WHERE b.userId = ${userId}
      AND (b.status = 'CONFIRMED' OR b.status = 'PENDING')
      AND ts.start >= ${startTimestamp}
      AND ts.start <= ${endTimestamp}
      ORDER BY ts.start
    ` as Array<{
      id: string;
      status: string;
      userId: string;
      start: number | bigint;
      end: number | bigint;
      courtNumber: number | null;
    }>;

    console.log('📚 Total bookings found:', classBookings.length);
    
    // Convertir BigInt a Number para evitar errores de serialización JSON
    const bookingsNormalized = classBookings.map(b => ({
      ...b,
      start: Number(b.start),
      end: Number(b.end)
    }));
    
    console.log('📋 First booking sample:', bookingsNormalized[0]);

    // Agrupar por fecha (YYYY-MM-DD)
    const bookingsByDate: Record<string, typeof bookingsNormalized> = {};
    
    bookingsNormalized.forEach(booking => {
      // booking.start es número (milisegundos), convertir a fecha
      const bookingDate = new Date(booking.start);
      const dateKey = bookingDate.toISOString().substring(0, 10); // YYYY-MM-DD
      console.log('🗓️ Booking date:', dateKey, 'from timestamp:', booking.start);
      if (!bookingsByDate[dateKey]) {
        bookingsByDate[dateKey] = [];
      }
      bookingsByDate[dateKey].push(booking);
    });

    // Construir respuesta con status por día
    const result: Record<string, {
      activityStatus: string;
      activityTypes: string[];
      hasEvent: boolean;
      anticipationPoints: number;
      bookingsCount: number;
      confirmedCount: number;
    }> = {};

    // Calcular días entre startDate y endDate para incluir días sin actividad
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    for (let i = 0; i <= daysDiff; i++) {
      const currentDate = new Date(start);
      currentDate.setDate(start.getDate() + i);
      const dateKey = currentDate.toISOString().substring(0, 10);
      
      const bookings = bookingsByDate[dateKey] || [];
      const confirmedCount = bookings.filter(b => b.courtNumber !== null).length;
      const pendingCount = bookings.filter(b => b.courtNumber === null).length;
      
      // Determinar el estado: confirmado tiene prioridad sobre inscrito
      let activityStatus = 'none';
      if (confirmedCount > 0) {
        activityStatus = 'confirmed'; // 🔴 Tiene al menos una reserva confirmada (con cancha asignada)
      } else if (pendingCount > 0) {
        activityStatus = 'inscribed'; // 🔵 Solo inscripciones pendientes (sin cancha asignada)
      }
      
      result[dateKey] = {
        activityStatus: activityStatus,
        activityTypes: bookings.length > 0 ? ['class'] : [],
        hasEvent: false,
        anticipationPoints: 0, // Se calcula en el cliente
        bookingsCount: bookings.length,
        confirmedCount: confirmedCount
      };
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ Error in batch activity check:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check activity status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
