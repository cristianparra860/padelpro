import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PUT - Actualizar una franja horaria
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; slotId: string } }
) {
  try {
    const body = await request.json();
    const { name, startTime, endTime, price, daysOfWeek, priority, isActive } = body;

    console.log('🔄 Actualizando franja horaria:', params.slotId);

    const priceSlot = await prisma.courtPriceSlot.update({
      where: { id: params.slotId },
      data: {
        name,
        startTime,
        endTime,
        price: price !== undefined ? parseFloat(price) : undefined,
        daysOfWeek: daysOfWeek !== undefined ? JSON.stringify(daysOfWeek) : undefined,
        priority: priority !== undefined ? priority : undefined,
        isActive: isActive !== undefined ? isActive : undefined
      }
    });

    console.log('✅ Franja horaria actualizada');
    return NextResponse.json(priceSlot);
  } catch (error) {
    console.error('❌ Error updating price slot:', error);
    return NextResponse.json(
      { error: 'Failed to update price slot' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar una franja horaria
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; slotId: string } }
) {
  try {
    console.log('🗑️ Eliminando franja horaria:', params.slotId);

    await prisma.courtPriceSlot.delete({
      where: { id: params.slotId }
    });

    console.log('✅ Franja horaria eliminada');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Error deleting price slot:', error);
    return NextResponse.json(
      { error: 'Failed to delete price slot' },
      { status: 500 }
    );
  }
}
