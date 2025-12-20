import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * PUT /api/admin/clubs/[clubId]/courts/[courtId]
 * Actualiza una pista existente
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { clubId: string; courtId: string } }
) {
  try {
    const { clubId, courtId: id } = params;
    const body = await request.json();
    const { number, name } = body;

    // Verificar que la pista existe y pertenece al club
    const existing = await prisma.court.findFirst({
      where: { id, clubId }
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Pista no encontrada' },
        { status: 404 }
      );
    }

    // Si se cambia el número, verificar que no exista otra pista con ese número
    if (number && number !== existing.number) {
      const duplicate = await prisma.court.findFirst({
        where: { 
          clubId, 
          number: Number(number),
          id: { not: id }
        }
      });

      if (duplicate) {
        return NextResponse.json(
          { error: `Ya existe otra pista con el número ${number}` },
          { status: 400 }
        );
      }
    }

    // Actualizar
    const updated = await prisma.court.update({
      where: { id },
      data: {
        ...(number !== undefined && { number: Number(number) }),
        ...(name !== undefined && { name })
      }
    });

    console.log(`✅ Pista actualizada: ${updated.name} (#${updated.number})`);

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error actualizando pista:', error);
    return NextResponse.json(
      { error: 'Error al actualizar la pista' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/clubs/[clubId]/courts/[courtId]
 * Elimina una pista
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { clubId: string; courtId: string } }
) {
  try {
    const { clubId, courtId: id } = params;

    // Verificar que existe
    const existing = await prisma.court.findFirst({
      where: { id, clubId }
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Pista no encontrada' },
        { status: 404 }
      );
    }

    // Verificar si tiene clases asignadas
    const assignedClasses = await prisma.timeSlot.count({
      where: { courtId: id }
    });

    if (assignedClasses > 0) {
      return NextResponse.json(
        { error: `No se puede eliminar. La pista tiene ${assignedClasses} clases asignadas` },
        { status: 400 }
      );
    }

    // Eliminar
    await prisma.court.delete({
      where: { id }
    });

    console.log(`✅ Pista eliminada: ${existing.name} (#${existing.number})`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error eliminando pista:', error);
    return NextResponse.json(
      { error: 'Error al eliminar la pista' },
      { status: 500 }
    );
  }
}
