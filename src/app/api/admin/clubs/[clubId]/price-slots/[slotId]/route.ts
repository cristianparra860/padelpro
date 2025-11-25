import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * PUT /api/admin/clubs/[clubId]/price-slots/[id]
 * Actualiza una franja horaria existente
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { clubId: string; id: string } }
) {
  try {
    const { clubId, id } = params;
    const body = await request.json();
    const { name, startTime, endTime, price, daysOfWeek, priority, isActive } = body;

    // Verificar que la franja existe y pertenece al club
    const existing = await prisma.courtPriceSlot.findFirst({
      where: { id, clubId }
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Franja horaria no encontrada' },
        { status: 404 }
      );
    }

    // Actualizar
    const updated = await prisma.courtPriceSlot.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(startTime !== undefined && { startTime }),
        ...(endTime !== undefined && { endTime }),
        ...(price !== undefined && { price: Number(price) }),
        ...(daysOfWeek !== undefined && { daysOfWeek: JSON.stringify(daysOfWeek) }),
        ...(priority !== undefined && { priority: Number(priority) }),
        ...(isActive !== undefined && { isActive })
      }
    });

    console.log(`✅ Franja horaria actualizada: ${updated.name}`);

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error actualizando franja horaria:', error);
    return NextResponse.json(
      { error: 'Error al actualizar la franja horaria' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/clubs/[clubId]/price-slots/[id]
 * Elimina una franja horaria
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { clubId: string; id: string } }
) {
  try {
    const { clubId, id } = params;

    // Verificar que existe
    const existing = await prisma.courtPriceSlot.findFirst({
      where: { id, clubId }
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Franja horaria no encontrada' },
        { status: 404 }
      );
    }

    // Eliminar
    await prisma.courtPriceSlot.delete({
      where: { id }
    });

    console.log(`✅ Franja horaria eliminada: ${existing.name}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error eliminando franja horaria:', error);
    return NextResponse.json(
      { error: 'Error al eliminar la franja horaria' },
      { status: 500 }
    );
  }
}
