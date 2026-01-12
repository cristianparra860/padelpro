import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    // ✅ ACTUALIZAR SALDO BLOQUEADO AL CARGAR:
    // Esto asegura que si una clase expiró hace 1 minuto, el saldo se desbloquee al entrar aquí
    try {
      // Importación dinámica para evitar ciclos si fuera necesario, o directa si está en otro archivo
      const { finalizeExpiredBookings } = await import('@/lib/blockedCredits');
      await finalizeExpiredBookings(userId);
    } catch (error) {
      console.error('Error actualizando créditos bloqueados:', error);
    }

    // Obtener todas las reservas del usuario usando Prisma ORM
    const bookings = await prisma.booking.findMany({
      where: {
        userId: userId,
        hiddenFromHistory: false
      },
      include: {
        user: { select: { name: true, email: true, profilePictureUrl: true } },
        timeSlot: {
          include: {
            instructor: {
              select: {
                id: true, name: true, profilePictureUrl: true,
                user: { select: { name: true } }
              }
            },
            court: { select: { number: true } },
            bookings: {
              include: {
                user: {
                  select: {
                    id: true, name: true, profilePictureUrl: true, level: true, gender: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        timeSlot: { start: 'asc' }
      }
    });

    // 🏟️ LÓGICA DE DISPONIBILIDAD DE PISTAS (Copiado de timeslots/route.ts)
    // 1. Identificar rango de fechas para bookings PENDIENTES FUTUROS (que necesitan mostrar disponibilidad)
    const now = new Date();
    const futurePendingBookings = bookings.filter(b =>
      b.status === 'PENDING' &&
      new Date(b.timeSlot.start) > now
    );

    let allCourts: any[] = [];
    let confirmedClasses: any[] = [];

    if (futurePendingBookings.length > 0) {
      // Obtener clubId (asumimos el del primer booking para simplicidad, o buscar todos los clubs involucrados)
      const clubId = futurePendingBookings[0].timeSlot.clubId;

      if (clubId) {
        // 2. Obtener todas las pistas del club
        allCourts = await prisma.court.findMany({
          where: { clubId, isActive: true },
          orderBy: { number: 'asc' }
        });

        // 3. Obtener clases confirmadas en el rango de fechas relevante
        const startTimes = futurePendingBookings.map(b => new Date(b.timeSlot.start).getTime());
        const minDate = new Date(Math.min(...startTimes));
        const maxDate = new Date(Math.max(...startTimes) + 24 * 60 * 60 * 1000); // +1 día margen

        confirmedClasses = await prisma.$queryRawUnsafe(`
          SELECT t.id, t.start, t.end, t.courtId
          FROM TimeSlot t
          WHERE t.clubId = ?
            AND t.start >= ? AND t.start <= ?
            AND t.courtId IS NOT NULL
        `,
          clubId,
          minDate.toISOString(),
          maxDate.toISOString()
        ) as any[];
      }
    }

    // Transformar a la estructura esperada
    const formattedBookings = bookings.map((booking) => {
      // Filtrar bookings según el status del booking principal
      let timeSlotBookings;
      if (booking.status === 'CANCELLED') {
        // Si el booking está cancelado, solo mostrar ese booking
        timeSlotBookings = booking.timeSlot.bookings?.filter(b => b.id === booking.id).map((b) => ({
          id: b.id,
          userId: b.userId,
          groupSize: b.groupSize,
          status: b.status,
          isRecycled: b.isRecycled || false,
          createdAt: b.createdAt?.toISOString(),
          user: {
            name: b.user?.name || '',
            profilePictureUrl: b.user?.profilePictureUrl || null,
            level: b.user?.level || null,
            gender: b.user?.gender || null
          }
        })) || [];
      } else {
        // Si no está cancelado, mostrar solo bookings activos
        timeSlotBookings = booking.timeSlot.bookings?.filter(b => b.status !== 'CANCELLED').map((b) => ({
          id: b.id,
          userId: b.userId,
          groupSize: b.groupSize,
          status: b.status,
          isRecycled: b.isRecycled || false,
          createdAt: b.createdAt?.toISOString(),
          user: {
            name: b.user?.name || '',
            profilePictureUrl: b.user?.profilePictureUrl || null,
            level: b.user?.level || null,
            gender: b.user?.gender || null
          }
        })) || [];
      }


      // 🏟️ CALCULAR DISPONIBILIDAD DE PISTAS PARA ESTE BOOKING
      let courtsAvailability: { courtNumber: number; courtId: string; status: string; }[] = [];

      const slotStart = new Date(booking.timeSlot.start).getTime();
      const slotEnd = new Date(booking.timeSlot.end).getTime();

      // Solo calcular para bookings pendientes futuros (optimización)
      if (booking.status === 'PENDING' && slotStart > Date.now() && allCourts.length > 0) {
        courtsAvailability = allCourts.map(court => {
          // Verificar si esta pista está ocupada
          const isOccupied = confirmedClasses.some((cls: any) => {
            const clsStart = typeof cls.start === 'bigint' ? Number(cls.start) : new Date(cls.start).getTime();
            const clsEnd = typeof cls.end === 'bigint' ? Number(cls.end) : new Date(cls.end).getTime();

            return cls.courtId === court.id && slotStart < clsEnd && slotEnd > clsStart;
          });

          return {
            courtNumber: court.number,
            courtId: court.id,
            status: isOccupied ? 'occupied' : 'available'
          };
        });
      }

      const formattedBooking = {
        id: booking.id,
        userId: booking.userId,
        timeSlotId: booking.timeSlotId,
        groupSize: booking.groupSize,
        status: booking.status,
        wasConfirmed: booking.wasConfirmed || false, // Para identificar cancelaciones de reservas confirmadas
        isRecycled: booking.isRecycled || false, // Para identificar plazas recicladas
        createdAt: booking.createdAt.toISOString(),
        updatedAt: booking.updatedAt.toISOString(),
        user: booking.user,
        timeSlot: {
          id: booking.timeSlot.id,
          start: booking.timeSlot.start.toISOString(),
          end: booking.timeSlot.end.toISOString(),
          level: booking.timeSlot.level || 'intermedio',
          category: booking.timeSlot.genderCategory || 'ABIERTO',
          genderCategory: booking.timeSlot.genderCategory || null,
          totalPrice: Number(booking.timeSlot.totalPrice),
          maxPlayers: booking.timeSlot.maxPlayers || 4,
          instructorId: booking.timeSlot.instructorId,
          instructorName: booking.timeSlot.instructor?.user?.name || booking.timeSlot.instructor?.name || 'Instructor',
          instructorProfilePicture: booking.timeSlot.instructor?.profilePictureUrl || null,
          courtId: booking.timeSlot.courtId,
          courtNumber: booking.timeSlot.courtNumber || booking.timeSlot.court?.number || null, // ✅ Primero intentar courtNumber directo del TimeSlot
          creditsSlots: booking.timeSlot.creditsSlots || [],
          instructor: booking.timeSlot.instructor || {
            id: booking.timeSlot.instructorId,
            name: 'Instructor',
            profilePictureUrl: null
          },
          court: booking.timeSlot.court,
          bookings: timeSlotBookings,
          courtsAvailability: courtsAvailability // ✅ Agregamos la disponibilidad calculada
        }
      };

      return formattedBooking;
    });

    console.log(`✅ Cargadas ${formattedBookings.length} reservas para usuario ${userId}`);

    return NextResponse.json(formattedBookings);

  } catch (error) {
    console.error('Error al obtener reservas del usuario:', error);
    return NextResponse.json(
      { error: 'Error al cargar las reservas' },
      { status: 500 }
    );
  }
}
