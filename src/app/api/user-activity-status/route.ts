// src/app/api/user-activity-status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { startOfDay, endOfDay } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const date = searchParams.get('date'); // formato YYYY-MM-DD

    if (!userId || !date) {
      return NextResponse.json(
        { error: 'userId and date are required' },
        { status: 400 }
      );
    }

    // Usar el formato de fecha directamente sin convertir a Date para evitar problemas de timezone
    // SQLite almacena las fechas como strings en formato ISO
    const startPattern = `${date}%`; // Formato: 2025-10-16%

    console.log('🔍 Checking activity status for:', { userId, date, startPattern });

    // Verificar si hay clases reservadas para ese día usando LIKE para el patrón de fecha
    const classBookings = await prisma.$queryRaw`
      SELECT 
        b.id,
        b.status,
        ts.start,
        ts.end
      FROM Booking b
      JOIN TimeSlot ts ON b.timeSlotId = ts.id
      WHERE b.userId = ${userId}
      AND b.status = 'CONFIRMED'
      AND ts.start LIKE ${startPattern}
    ` as any[];

    console.log('📚 Class bookings found:', classBookings.length);

    if (classBookings.length === 0) {
      return NextResponse.json({
        activityStatus: 'none',
        activityTypes: [],
        hasEvent: false,
        anticipationPoints: 0,
        bookingsCount: 0
      });
    }

    // Verificar si al menos una clase tiene pista asignada (courtNumber no es null)
    // Simplificado: si tiene bookings confirmados, muestra "inscribed"
    console.log('📊 Bookings found:', classBookings.length);

    // Construir respuesta
    // Siempre retorna "inscribed" porque no tenemos acceso a courtNumber por ahora
    const result = {
      activityStatus: classBookings.length > 0 ? 'inscribed' : 'none',
      activityTypes: ['class'],
      hasEvent: false,
      anticipationPoints: 0,
      bookingsCount: classBookings.length,
      confirmedCount: 0 // Temporalmente 0 hasta que arreglemos la BD
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ Error checking user activity status:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check activity status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
