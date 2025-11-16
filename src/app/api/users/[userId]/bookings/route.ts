import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;

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
                name: true,
                profilePictureUrl: true
              }
            },
            court: {
              select: {
                number: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Transformar a la estructura esperada
    const formattedBookings = bookings.map((booking) => ({
      id: booking.id,
      userId: booking.userId,
      groupSize: booking.groupSize,
      status: booking.status,
      createdAt: booking.createdAt.toISOString(),
      updatedAt: booking.updatedAt.toISOString(),
      user: booking.user,
      timeSlot: {
        id: booking.timeSlot.id,
        start: booking.timeSlot.start.toISOString(),
        end: booking.timeSlot.end.toISOString(),
        level: booking.timeSlot.level || 'intermedio',
        category: booking.timeSlot.genderCategory || 'mixto',
        totalPrice: Number(booking.timeSlot.totalPrice),
        maxPlayers: booking.timeSlot.maxPlayers || 4,
        totalPlayers: booking.timeSlot.totalPlayers || 0,
        instructor: booking.timeSlot.instructor || {
          name: 'Instructor',
          profilePictureUrl: null
        },
        court: booking.timeSlot.court
      }
    }));

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
