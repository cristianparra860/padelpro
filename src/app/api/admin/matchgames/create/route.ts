import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCourtPriceForTime } from '@/lib/courtPricing';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      clubId,
      start,
      end,
      duration,
      pricePerPlayer,
      isOpen,
      level,
      genderCategory
    } = body;

    console.log('\n➕ CREAR PARTIDA MANUALMENTE');
    console.log(`📅 Fecha: ${start}`);
    console.log(`⏱️ Duración: ${duration} min`);
    console.log(`💰 Precio: ${pricePerPlayer}€/jugador`);

    // Validaciones
    if (!clubId || !start || !end || !duration || !pricePerPlayer) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    // Verificar que no existe ya una partida en ese horario
    const existing = await prisma.matchGame.findFirst({
      where: {
        clubId,
        start: new Date(start),
        isOpen,
        level: level || null
      }
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Ya existe una partida similar en ese horario' },
        { status: 400 }
      );
    }

    // Calcular precio de pista según horario y duración
    const startDate = new Date(start);
    const courtPricePerHour = await getCourtPriceForTime(clubId, startDate);
    const courtPrice = courtPricePerHour * (duration / 60); // Precio proporcional
    
    // Crear la partida
    const matchGame = await prisma.matchGame.create({
      data: {
        clubId,
        start: startDate,
        end: new Date(end),
        duration,
        maxPlayers: 4,
        pricePerPlayer,
        courtRentalPrice: courtPrice,
        level: level || null,
        genderCategory: genderCategory || null,
        isOpen: isOpen ?? true,
        creditsSlots: JSON.stringify([1, 2, 3, 4]),
        creditsCost: 50
      }
    });

    console.log(`✅ Partida creada: ${matchGame.id}`);

    return NextResponse.json({
      success: true,
      matchGame
    });

  } catch (error) {
    console.error('❌ Error al crear partida:', error);
    return NextResponse.json(
      { 
        error: 'Error al crear partida',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
