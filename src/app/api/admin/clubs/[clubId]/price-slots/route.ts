import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/clubs/[clubId]/price-slots
 * Obtiene todas las franjas horarias de un club
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { clubId: string } }
) {
  try {
    const { clubId } = params;

    const priceSlots = await prisma.courtPriceSlot.findMany({
      where: { clubId },
      orderBy: { priority: 'desc' }
    });

    return NextResponse.json(priceSlots);
  } catch (error) {
    console.error('Error obteniendo franjas horarias:', error);
    return NextResponse.json(
      { error: 'Error al obtener las franjas horarias' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/clubs/[clubId]/price-slots
 * Crea una nueva franja horaria
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { clubId: string } }
) {
  try {
    const { clubId } = params;
    const body = await request.json();
    const { name, startTime, endTime, price, daysOfWeek, priority } = body;

    // Validaciones
    if (!name || !startTime || !endTime || price === undefined) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    // Crear la franja horaria
    const priceSlot = await prisma.courtPriceSlot.create({
      data: {
        clubId,
        name,
        startTime,
        endTime,
        price: Number(price),
        daysOfWeek: JSON.stringify(daysOfWeek || []),
        priority: priority || 0,
        isActive: true
      }
    });

    console.log(`✅ Franja horaria creada: ${name} (${startTime}-${endTime}) - €${price}`);

    return NextResponse.json(priceSlot);
  } catch (error) {
    console.error('Error creando franja horaria:', error);
    return NextResponse.json(
      { error: 'Error al crear la franja horaria' },
      { status: 500 }
    );
  }
}
