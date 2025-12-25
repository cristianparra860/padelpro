// API endpoint para obtener un TimeSlot específico por ID
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const timeSlotId = params.id;

    console.log(`🔍 Buscando TimeSlot: ${timeSlotId}`);

    // Buscar el TimeSlot con todos sus datos relacionados
    const timeSlot = await prisma.timeSlot.findUnique({
      where: { id: timeSlotId },
      include: {
        instructor: {
          include: {
            user: true
          }
        },
        bookings: {
          where: {
            status: { in: ['PENDING', 'CONFIRMED', 'CANCELLED'] } // ✅ Incluir CANCELLED para mostrar en tarjetas
          },
          include: {
            user: true
          },
          orderBy: {
            createdAt: 'asc'
          }
        },
        court: true
      }
    });

    if (!timeSlot) {
      return NextResponse.json(
        { error: 'TimeSlot no encontrado' },
        { status: 404 }
      );
    }

    console.log(`✅ TimeSlot encontrado: ${timeSlot.id}`);
    console.log(`📅 Fechas originales:`, {
      start: timeSlot.start,
      startType: typeof timeSlot.start,
      end: timeSlot.end,
      endType: typeof timeSlot.end
    });

    // Formatear la respuesta igual que /api/timeslots
    // Convertir timestamps (BigInt o number) a ISO strings
    const startDate = typeof timeSlot.start === 'bigint' 
      ? new Date(Number(timeSlot.start)) 
      : new Date(timeSlot.start);
    const endDate = typeof timeSlot.end === 'bigint'
      ? new Date(Number(timeSlot.end))
      : new Date(timeSlot.end);
    const createdDate = typeof timeSlot.createdAt === 'bigint'
      ? new Date(Number(timeSlot.createdAt))
      : new Date(timeSlot.createdAt);
    const updatedDate = typeof timeSlot.updatedAt === 'bigint'
      ? new Date(Number(timeSlot.updatedAt))
      : new Date(timeSlot.updatedAt);

    console.log(`📅 Fechas convertidas:`, {
      start: startDate.toISOString(),
      end: endDate.toISOString()
    });

    const formattedSlot = {
      id: timeSlot.id,
      clubId: timeSlot.clubId,
      courtId: timeSlot.courtId,
      instructorId: timeSlot.instructorId,
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      startTime: startDate.toISOString(), // Para compatibilidad con ClassCardReal
      endTime: endDate.toISOString(),     // Para compatibilidad con ClassCardReal
      maxPlayers: timeSlot.maxPlayers,
      totalPrice: timeSlot.totalPrice,
      instructorPrice: timeSlot.instructorPrice,
      courtRentalPrice: timeSlot.courtRentalPrice,
      level: timeSlot.level,
      category: timeSlot.category || 'general',
      genderCategory: timeSlot.genderCategory,
      createdAt: createdDate.toISOString(),
      updatedAt: updatedDate.toISOString(),
      instructorName: timeSlot.instructor?.user?.name || 'Instructor',
      instructorProfilePicture: timeSlot.instructor?.user?.profilePictureUrl,
      courtNumber: timeSlot.courtNumber,
      bookedPlayers: timeSlot.bookings.length,
      bookings: timeSlot.bookings.map(booking => {
        const bookingCreatedDate = typeof booking.createdAt === 'bigint'
          ? new Date(Number(booking.createdAt))
          : new Date(booking.createdAt);
        
        return {
          id: booking.id,
          userId: booking.userId,
          name: booking.user?.name, // ✅ Nombre del usuario
          userName: booking.user?.name,
          profilePictureUrl: booking.user?.profilePictureUrl, // ✅ Foto de perfil
          userProfilePicture: booking.user?.profilePictureUrl,
          userLevel: booking.user?.level, // ✅ Nivel del usuario
          userGender: booking.user?.gender, // ✅ Género del usuario
          groupSize: booking.groupSize,
          status: booking.status,
          isRecycled: booking.isRecycled || false, // ♻️ Campo isRecycled
          createdAt: bookingCreatedDate.toISOString()
        };
      }),
      description: ''
    };

    // ♻️ CALCULAR PLAZAS RECICLADAS
    // Buscar bookings cancelados con isRecycled=true
    const recycledBookings = timeSlot.bookings.filter(b => 
      b.status === 'CANCELLED' && b.isRecycled === true
    );
    
    if (recycledBookings.length > 0) {
      console.log(`♻️ Plazas recicladas encontradas: ${recycledBookings.length}`);
      
      // Determinar la modalidad (groupSize del booking reciclado)
      const groupSize = recycledBookings[0].groupSize;
      
      // Contar cuántas plazas están disponibles (canceladas recicladas)
      const availableRecycledSlots = recycledBookings.length;
      
      // Verificar si TODAS las plazas recicladas son solo por puntos
      const allRecycledArePoints = recycledBookings.every(b => 
        b.paidWithPoints === 1 || b.paidWithPoints === true
      );
      
      // Agregar campos de reciclaje al response
      formattedSlot.hasRecycledSlots = true;
      formattedSlot.availableRecycledSlots = availableRecycledSlots;
      formattedSlot.recycledSlotsOnlyPoints = allRecycledArePoints;
      
      console.log(`♻️ Datos reciclados:`, {
        hasRecycledSlots: true,
        availableRecycledSlots,
        recycledSlotsOnlyPoints: allRecycledArePoints,
        groupSize
      });
    } else {
      formattedSlot.hasRecycledSlots = false;
      formattedSlot.availableRecycledSlots = 0;
      formattedSlot.recycledSlotsOnlyPoints = false;
    }

    return NextResponse.json(formattedSlot);

  } catch (error) {
    console.error('❌ Error obteniendo TimeSlot:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
