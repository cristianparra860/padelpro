import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/clubs/[clubId]/courts
 * Obtiene todas las pistas de un club
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  try {
    const { clubId } = await params;

    const courts = await prisma.court.findMany({
      where: { clubId },
      orderBy: { number: 'asc' }
    });

    return NextResponse.json(courts);
  } catch (error) {
    console.error('Error obteniendo pistas:', error);
    return NextResponse.json(
      { error: 'Error al obtener las pistas' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/clubs/[clubId]/courts
 * Crea una nueva pista
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  try {
    const { clubId } = await params;
    const body = await request.json();
    const { number, name } = body;

    // Validaciones
    if (!number || !name) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    // Verificar que no exista ya una pista con ese número
    const existing = await prisma.court.findFirst({
      where: { clubId, number: Number(number) }
    });

    if (existing) {
      return NextResponse.json(
        { error: `Ya existe una pista con el número ${number}` },
        { status: 400 }
      );
    }

    // Verificar que el club existe
    const club = await prisma.club.findUnique({
      where: { id: clubId }
    });

    if (!club) {
      return NextResponse.json(
        { error: `El club con ID '${clubId}' no existe en la base de datos` },
        { status: 404 }
      );
    }

    // Crear la pista
    const court = await prisma.court.create({
      data: {
        clubId,
        number: Number(number),
        name
      }
    });

    console.log(`✅ Pista creada: ${name} (#${number}) para club ${club.name}`);

    return NextResponse.json(court);
  } catch (error) {
    console.error('Error creando pista:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error al crear la pista';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
