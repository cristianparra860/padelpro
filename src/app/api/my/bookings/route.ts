import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    console.log('📋 GET /api/my/bookings - Starting...');
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    console.log('🆔 userId solicitado:', userId);

    if (!userId) {
      return NextResponse.json(
        { message: 'userId es requerido' },
        { status: 400 }
      );
    }

    // Obtener solo las reservas que pertenecen a clases COMPLETADAS (clases que ya se llenaron y se confirmaron)
    // Una clase se considera completada cuando tiene suficientes reservas para funcionar
    const bookings = await prisma.$queryRaw`
      SELECT 
        b.id,
        b.userId,
        b.timeSlotId,
        b.groupSize,
        b.status,
        b.createdAt,
        b.updatedAt,
        ts.id as timeSlot_id,
        ts.clubId as timeSlot_clubId,
        ts.courtId as timeSlot_courtId,
        ts.instructorId as timeSlot_instructorId,
        ts.start as timeSlot_start,
        ts.end as timeSlot_end,
        ts.maxPlayers as timeSlot_maxPlayers,
        ts.totalPrice as timeSlot_totalPrice,
        ts.level as timeSlot_level,
        ts.category as timeSlot_category,
        u.name as instructor_name,
        u.profilePictureUrl as instructor_profilePictureUrl,
        c.number as court_number,
        (SELECT COUNT(*) FROM Booking b2 
         WHERE b2.timeSlotId = ts.id 
         AND b2.status IN ('PENDING', 'CONFIRMED')) as total_bookings
      FROM Booking b
      LEFT JOIN TimeSlot ts ON b.timeSlotId = ts.id
      LEFT JOIN Instructor i ON ts.instructorId = i.id
      LEFT JOIN User u ON i.userId = u.id
      LEFT JOIN Court c ON ts.courtId = c.id
      WHERE b.userId = ${userId}
      ORDER BY ts.start ASC
    ` as any[];

    console.log('📊 Reservas encontradas:', bookings.length);

    // Agrupar reservas por timeSlot para evitar duplicados
    const bookingsByTimeSlot = new Map<string, any[]>();
    
    bookings.forEach(booking => {
      const timeSlotId = booking.timeSlot_id;
      if (!bookingsByTimeSlot.has(timeSlotId)) {
        bookingsByTimeSlot.set(timeSlotId, []);
      }
      bookingsByTimeSlot.get(timeSlotId)!.push(booking);
    });

    console.log('📊 TimeSlots únicos encontrados:', bookingsByTimeSlot.size);

    // Formatear cada timeSlot con todas sus reservas agrupadas
    const formattedBookings = Array.from(bookingsByTimeSlot.entries()).map(([timeSlotId, timeSlotBookings]) => {
      const firstBooking = timeSlotBookings[0]; // Usar el primer booking para datos del timeSlot
      console.log('📋 Processing timeSlot:', timeSlotId, 'with', timeSlotBookings.length, 'bookings');
      
      // Calcular total de jugadores reservados por este usuario
      const totalGroupSize = timeSlotBookings.reduce((sum, b) => sum + (b.groupSize || 1), 0);
      
      // Formato exacto que espera ClassCardReal (TimeSlot interface)
      return {
        id: timeSlotId,  // ID original del timeSlot para APIs
        activityId: timeSlotId, // Para agrupamiento en PersonalSchedule
        uniqueKey: `${timeSlotId}-user-bookings`,  // Key único para React
        clubId: firstBooking.timeSlot_clubId,
        startTime: new Date(firstBooking.timeSlot_start),
        endTime: new Date(firstBooking.timeSlot_end),
        durationMinutes: Math.floor((new Date(firstBooking.timeSlot_end).getTime() - new Date(firstBooking.timeSlot_start).getTime()) / (1000 * 60)),
        instructorId: firstBooking.timeSlot_instructorId,
        instructorName: firstBooking.instructor_name || 'Instructor no asignado',
        maxPlayers: Number(firstBooking.timeSlot_maxPlayers),
        courtNumber: firstBooking.court_number || 1,
        level: firstBooking.timeSlot_level || 'abierto',
        category: firstBooking.timeSlot_category || 'abierta',
        status: firstBooking.status, // Status real del booking
        totalPrice: Number(firstBooking.timeSlot_totalPrice),
        
        // Alias para compatibilidad con PersonalSchedule
        slotDetails: {
          startTime: new Date(firstBooking.timeSlot_start),
          endTime: new Date(firstBooking.timeSlot_end),
          clubId: firstBooking.timeSlot_clubId
        },
        
        // Lista de jugadores reservados (formato que espera ClassCardReal)
        bookedPlayers: [
          {
            userId: firstBooking.userId,
            name: `Tus reservas (${totalGroupSize} jugador${totalGroupSize > 1 ? 'es' : ''})`,
            groupSize: totalGroupSize,
            isSimulated: false,
            profilePictureUrl: `https://avatar.vercel.sh/reserva-total-${totalGroupSize}.png?size=60`
          }
        ],
        
        // Metadatos específicos de las reservas del usuario (usando la más reciente)
        userBooking: {
          id: timeSlotBookings.map(b => b.id).join(','), // IDs de todas las reservas
          userId: firstBooking.userId,
          groupSize: totalGroupSize, // Total de jugadores reservados
          status: firstBooking.status, // Todas deberían tener el mismo status
          createdAt: firstBooking.createdAt,
          bookingDetails: timeSlotBookings.map(b => ({
            id: b.id,
            groupSize: b.groupSize || 1,
            createdAt: b.createdAt
          })),
          isCompleted: Number(firstBooking.total_bookings) >= Number(firstBooking.timeSlot_maxPlayers),
          isPast: new Date(firstBooking.timeSlot_start) < new Date()
        }
      };
    });

    console.log('✅ Returning formatted bookings:', formattedBookings.length);

    return NextResponse.json(formattedBookings);

  } catch (error) {
    console.error('❌ Error al obtener reservas:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );  }
}
