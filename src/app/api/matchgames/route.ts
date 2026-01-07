import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clubId = searchParams.get('clubId');
    const date = searchParams.get('date');

    if (!clubId) {
      return NextResponse.json(
        { error: 'clubId es requerido' },
        { status: 400 }
      );
    }

    let whereConditions: any = { clubId };

    if (date) {
      // Crear rango de fecha para el día completo
      const startOfDay = new Date(date + 'T00:00:00.000Z');
      const endOfDay = new Date(date + 'T23:59:59.999Z');

      whereConditions.start = {
        gte: startOfDay,
        lte: endOfDay
      };
    }

    // Obtener todas las partidas (propuestas y confirmadas)
    const matchGames = await prisma.matchGame.findMany({
      where: whereConditions,
      include: {
        bookings: {
          where: {
            status: { in: ['PENDING', 'CONFIRMED'] }
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                profilePictureUrl: true,
                level: true,
                position: true
              }
            }
          }
        }
      },
      orderBy: { start: 'asc' }
    });

    console.log(`🎾 GET /api/matchgames - Total partidas: ${matchGames.length}`);
    const openMatches = matchGames.filter(m => m.isOpen);
    const classifiedMatches = matchGames.filter(m => !m.isOpen);
    console.log(`   - Partidas abiertas: ${openMatches.length}`);
    console.log(`   - Partidas clasificadas: ${classifiedMatches.length}`);
    
    if (openMatches.length > 0) {
      console.log(`   📋 Partidas abiertas:`, openMatches.map(m => ({
        id: m.id,
        hora: new Date(m.start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        jugadores: m.bookings.length
      })));
    }

    return NextResponse.json({
      success: true,
      matchGames
    });
  } catch (error) {
    console.error('Error fetching match games:', error);
    return NextResponse.json(
      { error: 'Error al obtener las partidas', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
