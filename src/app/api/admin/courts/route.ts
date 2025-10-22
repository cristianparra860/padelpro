import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clubId = searchParams.get('clubId');

    // Construir el filtro basado en clubId
    const where = clubId ? { clubId } : {};

    const courts = await prisma.court.findMany({
      where,
      orderBy: {
        number: 'asc'
      }
    });

    return NextResponse.json(courts);
  } catch (error) {
    console.error('Error fetching courts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch courts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clubId, number, name, isActive = true } = body;

    console.log('📝 Creating court:', { clubId, number, name, isActive });

    if (!clubId || !number || !name) {
      return NextResponse.json(
        { error: 'Club ID, number and name are required' },
        { status: 400 }
      );
    }

    // Verificar si ya existe una pista con ese número en el club
    const existingCourt = await prisma.court.findFirst({
      where: {
        clubId,
        number: parseInt(number)
      }
    });

    if (existingCourt) {
      return NextResponse.json(
        { error: `Ya existe una pista con el número ${number} en este club` },
        { status: 409 }
      );
    }

    const court = await prisma.court.create({
      data: {
        clubId,
        number: parseInt(number),
        name,
        isActive
      }
    });

    console.log('✅ Court created successfully:', court.id);
    return NextResponse.json(court);
  } catch (error) {
    console.error('❌ Error creating court:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create court',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}