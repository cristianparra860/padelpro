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
                user: {
                  select: {
                    name: true,
                    profilePictureUrl: true
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

    return NextResponse.json(matchBookings);
  } catch (error) {
    console.error('❌ Error fetching user match bookings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user match bookings' },
      { status: 500 }
    );
  }
}
