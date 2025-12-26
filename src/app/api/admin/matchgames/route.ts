import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    const {
      clubId,
      start,
      end,
      duration = 60,
      courtRentalPrice,
      pricePerPlayer,
      isOpen = true,
      creditsCost = 50
    } = data;
    
    console.log('\n🎾 === CREATING MATCH GAME (ADMIN) ===');
    console.log('📝 Datos:', data);
    
    if (!clubId || !start || !end || pricePerPlayer === undefined) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }
    
    const matchGame = await prisma.matchGame.create({
      data: {
        clubId,
        start: new Date(start),
        end: new Date(end),
        duration,
        maxPlayers: 4,
        courtRentalPrice: courtRentalPrice || pricePerPlayer * 4,
        pricePerPlayer,
        isOpen,
        creditsCost
      }
    });
    
    console.log(`✅ Partida creada: ${matchGame.id}`);
    
    return NextResponse.json(matchGame);
    
  } catch (error) {
    console.error('❌ Error en POST /api/admin/matchgames:', error);
    return NextResponse.json(
      { error: 'Error al crear partida', details: (error as Error).message },
      { status: 500 }
    );
  }
}
