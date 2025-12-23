import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    // Obtener todas las reservas del usuario usando Prisma ORM
    const bookings = await prisma.booking.findMany({
      where: {
        userId: userId
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            profilePictureUrl: true
          }
        },
        timeSlot: {
          include: {
            instructor: {
              select: {
                id: true,
                name: true,
                profilePictureUrl: true,
                user: {
                  select: {
                    name: true
                  }
                }
              }
            },
            court: {
              select: {
                number: true
              }
            },
            bookings: {
              // Incluir TODOS los bookings para poder mostrar correctamente las canceladas
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    profilePictureUrl: true,
                    level: true,
                    gender: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        timeSlot: {
          start: 'asc'  // ✅ Ordenar por fecha de clase (más antiguas primero)
        }
      }
    });

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
          name: b.user?.name || '',
          profilePictureUrl: b.user?.profilePictureUrl || null,
          userLevel: b.user?.level || null,
          userGender: b.user?.gender || null,
          createdAt: b.createdAt?.toISOString()
        })) || [];
      } else {
        // Si no está cancelado, mostrar solo bookings activos
        timeSlotBookings = booking.timeSlot.bookings?.filter(b => b.status !== 'CANCELLED').map((b) => ({
          id: b.id,
          userId: b.userId,
          groupSize: b.groupSize,
          status: b.status,
          isRecycled: b.isRecycled || false,
          name: b.user?.name || '',
          profilePictureUrl: b.user?.profilePictureUrl || null,
          userLevel: b.user?.level || null,
          userGender: b.user?.gender || null,
          createdAt: b.createdAt?.toISOString()
        })) || [];
      }

      return {
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
          totalPlayers: booking.timeSlot.totalPlayers || 0,
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
          bookings: timeSlotBookings
        }
      };
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
