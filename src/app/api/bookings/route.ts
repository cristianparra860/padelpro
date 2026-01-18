import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const timeSlotId = searchParams.get('timeSlotId');

    let query = `
      SELECT 
        b.*,
        u.name as userName,
        u.email as userEmail,
        ts.start as classStart,
        ts.end as classEnd,
        i.name as instructorName
      FROM Booking b
      JOIN User u ON b.userId = u.id
      JOIN TimeSlot ts ON b.timeSlotId = ts.id
      LEFT JOIN Instructor i ON ts.instructorId = i.id
    `;

    const conditions = [];
    const params = [];

    if (userId) {
      conditions.push('b.userId = ?');
      params.push(userId);
    }

    if (timeSlotId) {
      conditions.push('b.timeSlotId = ?');
      params.push(timeSlotId);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY ts.start ASC';

    const bookings = await prisma.$queryRawUnsafe(query, ...params);

    return NextResponse.json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, timeSlotId, groupSize = 1 } = body;

    console.log('📝 Creating booking:', { userId, timeSlotId, groupSize });

    if (!userId || !timeSlotId) {
      return NextResponse.json(
        { error: 'userId and timeSlotId are required' },
        { status: 400 }
      );
    }

    // Verificar que el time slot existe
    const timeSlotQuery = await prisma.$queryRaw`
      SELECT * FROM TimeSlot WHERE id = ${timeSlotId}
    ` as any[];

    console.log('📊 TimeSlot query result:', timeSlotQuery);

    if (timeSlotQuery.length === 0) {
      return NextResponse.json(
        { error: 'Time slot not found' },
        { status: 404 }
      );
    }

    const slot = timeSlotQuery[0];

    // Contar reservas por separado para evitar problemas de BigInt
    const bookingCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM Booking 
      WHERE timeSlotId = ${timeSlotId} AND status = 'CONFIRMED'
    ` as any[];

    const bookedPlayers = Number(bookingCount[0].count);

    console.log(' Slot details:', {
      id: slot.id,
      maxPlayers: slot.maxPlayers,
      bookedPlayers: bookedPlayers,
      availableSpots: slot.maxPlayers - bookedPlayers
    });

    if (bookedPlayers + groupSize > slot.maxPlayers) {
      return NextResponse.json(
        { error: 'Not enough space in this class' },
        { status: 400 }
      );
    }

    // Verificar si ya existe una reserva del usuario para este slot
    const existingBooking = await prisma.$queryRaw`
      SELECT id FROM Booking 
      WHERE userId = ${userId} AND timeSlotId = ${timeSlotId}
    ` as any[];

    if (existingBooking.length > 0) {
      return NextResponse.json(
        { error: 'User already has a booking for this time slot' },
        { status: 400 }
      );
    }

    // 🆕 VALIDACIÓN: Un usuario solo puede tener 1 clase por día
    // Obtener fecha del time slot actual
    const slotDateStart = new Date(slot.start);
    slotDateStart.setHours(0, 0, 0, 0);
    const slotDateEnd = new Date(slot.start);
    slotDateEnd.setHours(23, 59, 59, 999);

    // Buscar otras reservas CONFIRMADAS del usuario para este MISMO DÍA
    // Excluyendo canceladas
    const existingDayBookings = await prisma.$queryRaw`
      SELECT b.id 
      FROM Booking b
      JOIN TimeSlot ts ON b.timeSlotId = ts.id
      WHERE b.userId = ${userId}
      AND b.status = 'CONFIRMED'
      AND ts.start >= ${slotDateStart.toISOString()}
      AND ts.start <= ${slotDateEnd.toISOString()}
    ` as any[];

    if (existingDayBookings.length > 0) {
      console.log(`❌ User ${userId} already has ${existingDayBookings.length} bookings on ${slotDateStart.toISOString()}`);
      return NextResponse.json(
        { error: 'User already has a confirmed class for this day' },
        { status: 400 }
      );
    }

    // Crear la reserva
    const bookingId = `booking-${Date.now()}-${userId}`;
    await prisma.$executeRaw`
      INSERT INTO Booking (id, userId, timeSlotId, groupSize, status, createdAt, updatedAt)
      VALUES (${bookingId}, ${userId}, ${timeSlotId}, ${groupSize}, 'CONFIRMED', datetime('now'), datetime('now'))
    `;

    // ==========================================
    // SISTEMA DE "CARRERA" (RACE SYSTEM)
    // ==========================================
    // Cada opción de grupo (1, 2, 3, o 4 jugadores) compite independientemente
    // La primera opción que se completa gana y se le asigna pista

    console.log('🏁 RACE SYSTEM: Checking if any group option is complete...');
    console.log('   New booking:', { userId, groupSize, timeSlotId });

    // Verificar si esta clase ya tiene pista asignada (ya se completó una opción)
    if (slot.courtNumber) {
      console.log('   ⚠️ Class already has court assigned:', slot.courtNumber);
      console.log('   This slot already completed, but allowing booking anyway');
      return NextResponse.json({
        success: true,
        bookingId,
        message: 'Booking created (class already completed with another option)',
        classComplete: true,
        courtAssigned: slot.courtNumber
      });
    }

    // Obtener TODAS las reservas del timeSlot agrupadas por groupSize
    const allBookingsRaw = await prisma.$queryRaw`
      SELECT groupSize, COUNT(*) as count
      FROM Booking
      WHERE timeSlotId = ${timeSlotId}
      AND status = 'CONFIRMED'
      GROUP BY groupSize
    ` as any[];

    console.log('   📊 Current bookings by group size:', allBookingsRaw);

    // Verificar cada opción de grupo para ver si se completó
    let completedOption = null;

    for (const group of allBookingsRaw) {
      const size = group.groupSize;
      const count = Number(group.count);

      console.log(`   Checking option ${size} players: ${count} booking(s)`);

      // Una opción se completa cuando hay al menos 1 reserva de ese groupSize
      // Porque cada reserva ya representa el número completo de jugadores
      // Ejemplo: 1 reserva de groupSize=1 → clase de 1 jugador completa
      // Ejemplo: 1 reserva de groupSize=4 → clase de 4 jugadores completa
      if (count >= 1) {
        completedOption = { groupSize: size, count };
        console.log(`   ✅ WINNER! Option for ${size} player(s) is COMPLETE!`);
        break;
      }
    }

    // Si alguna opción se completó, asignar pista
    if (completedOption) {
      console.log('🎾 Assigning court to completed class...');
      console.log('   Winning option:', completedOption);

      // Buscar todas las pistas del club
      const allCourts = await prisma.$queryRaw`
        SELECT c.id, c.number
        FROM Court c
        WHERE c.clubId = ${slot.clubId}
        ORDER BY c.number
      ` as any[];

      console.log('   🏢 Total courts in club:', allCourts.length);

      if (allCourts.length > 0) {
        // Buscar pistas ocupadas en ese horario
        const occupiedCourts = await prisma.$queryRaw`
          SELECT ts.courtNumber
          FROM TimeSlot ts
          WHERE ts.clubId = ${slot.clubId}
          AND ts.courtNumber IS NOT NULL
          AND ts.start = ${slot.start}
          AND ts.id != ${timeSlotId}
        ` as any[];

        const occupiedNumbers = occupiedCourts.map((c: any) => c.courtNumber);
        console.log('   🚫 Occupied courts at this time:', occupiedNumbers);

        // Encontrar primera pista disponible
        const availableCourt = allCourts.find(c => !occupiedNumbers.includes(c.number));

        if (availableCourt) {
          console.log('   ✅ Assigning court:', availableCourt.number);

          // Asignar la pista al TimeSlot
          await prisma.$executeRaw`
            UPDATE TimeSlot 
            SET courtNumber = ${availableCourt.number}, 
                courtId = ${availableCourt.id},
                updatedAt = datetime('now')
            WHERE id = ${timeSlotId}
          `;

          console.log('   🎉 Court assigned successfully! Court number:', availableCourt.number);
          console.log('   📝 Note: Other group options should now be cancelled/hidden in frontend');

          return NextResponse.json({
            success: true,
            bookingId,
            message: 'Booking created and court assigned!',
            classComplete: true,
            courtAssigned: availableCourt.number,
            winningOption: completedOption.groupSize
          });
        } else {
          console.log('   ⚠️ No available courts found - all occupied');
        }
      } else {
        console.log('   ⚠️ No courts found in this club');
      }
    } else {
      console.log('   ℹ️ No group option is complete yet. Race continues...');
    }

    return NextResponse.json({
      success: true,
      bookingId,
      message: 'Booking created successfully',
      classComplete: false
    });

  } catch (error) {
    console.error('❌ Error creating booking:', error);
    console.error('❌ Error details:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      {
        error: 'Failed to create booking',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
