import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Obtener todas las franjas horarias de un club
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const priceSlots = await prisma.courtPriceSlot.findMany({
      where: {
        clubId: params.id
      },
      orderBy: [
        { priority: 'desc' },
        { startTime: 'asc' }
      ]
    });

    return NextResponse.json(priceSlots);
  } catch (error) {
    console.error('❌ Error fetching price slots:', error);
    return NextResponse.json(
      { error: 'Failed to fetch price slots' },
      { status: 500 }
    );
  }
}

// POST - Crear nueva franja horaria
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, startTime, endTime, price, daysOfWeek, priority } = body;

    console.log('🆕 Creando franja horaria:', body);

    const priceSlot = await prisma.courtPriceSlot.create({
      data: {
        clubId: params.id,
        name,
        startTime,
        endTime,
        price: parseFloat(price),
        daysOfWeek: JSON.stringify(daysOfWeek),
        priority: priority || 0,
        isActive: true
      }
    });

    console.log('✅ Franja horaria creada:', priceSlot.id);
    return NextResponse.json(priceSlot);
  } catch (error) {
    console.error('❌ Error creating price slot:', error);
    return NextResponse.json(
      { error: 'Failed to create price slot' },
      { status: 500 }
    );
  }
}
