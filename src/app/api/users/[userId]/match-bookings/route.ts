import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    // Obtener todos los MatchGameBookings del usuario
    const matchBookings = await prisma.matchGameBooking.findMany({
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
        matchGame: {
          include: {
            bookings: {
              where: {
                status: { in: ['PENDING', 'CONFIRMED', 'CANCELLED'] }
              },
              select: {
                id: true,
                userId: true,
                status: true,
                groupSize: true,
                isRecycled: true,
                user: {
                  select: {
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
        createdAt: 'desc'
      }
    });

    console.log(`✅ Cargadas ${matchBookings.length} reservas de partidas para usuario ${userId}`);

    // Transformar los datos para incluir el objeto user nested en los bookings
    const processedMatchBookings = matchBookings.map(mb => ({
      ...mb,
      matchGame: {
        ...mb.matchGame,
        start: mb.matchGame.start.toISOString(),
        end: mb.matchGame.end.toISOString(),
        bookings: mb.matchGame.bookings.map(b => ({
          id: b.id,
          userId: b.userId,
          status: b.status,
          groupSize: b.groupSize,
          isRecycled: b.isRecycled,
          user: {
            name: b.user.name,
            profilePictureUrl: b.user.profilePictureUrl,
            level: b.user.level,
            gender: b.user.gender
          }
        }))
      }
    }));

    return NextResponse.json(processedMatchBookings);
  } catch (error) {
    console.error('❌ Error fetching user match bookings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user match bookings' },
      { status: 500 }
    );
  }
}
