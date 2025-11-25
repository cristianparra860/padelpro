// src/app/api/admin/clubs/[clubId]/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PUT - Actualizar usuario
export async function PUT(
  request: NextRequest,
  { params }: { params: { clubId: string; id: string } }
) {
  try {
    const { clubId, id } = params;
    const body = await request.json();

    const { name, email, level, genderCategory, credits, points } = body;

    // Verificar que el usuario pertenece al club
    const existingUser = await prisma.user.findFirst({
      where: {
        id,
        clubId
      }
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: 'Usuario no encontrado o no pertenece a este club' },
        { status: 404 }
      );
    }

    // Si se está cambiando el email, verificar que no esté en uso
    if (email && email !== existingUser.email) {
      const emailInUse = await prisma.user.findUnique({
        where: { email }
      });

      if (emailInUse) {
        return NextResponse.json(
          { error: 'El email ya está en uso' },
          { status: 400 }
        );
      }
    }

    console.log('✏️ Actualizando usuario:', id);

    // Actualizar usuario
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(level && { level }),
        ...(genderCategory !== undefined && { genderCategory }),
        ...(credits !== undefined && { credits: Number(credits) }),
        ...(points !== undefined && { points: Number(points) })
      }
    });

    console.log('✅ Usuario actualizado');

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('❌ Error actualizando usuario:', error);
    return NextResponse.json(
      { error: 'Error al actualizar usuario' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar usuario
export async function DELETE(
  request: NextRequest,
  { params }: { params: { clubId: string; id: string } }
) {
  try {
    const { clubId, id } = params;

    // Verificar que el usuario pertenece al club
    const existingUser = await prisma.user.findFirst({
      where: {
        id,
        clubId
      }
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: 'Usuario no encontrado o no pertenece a este club' },
        { status: 404 }
      );
    }

    // Verificar si el usuario tiene reservas activas
    const activeBookings = await prisma.booking.count({
      where: {
        userId: id,
        status: {
          in: ['PENDING', 'CONFIRMED']
        }
      }
    });

    if (activeBookings > 0) {
      return NextResponse.json(
        { error: `No se puede eliminar: el usuario tiene ${activeBookings} reserva(s) activa(s)` },
        { status: 400 }
      );
    }

    console.log('🗑️ Eliminando usuario:', id);

    // Eliminar usuario
    await prisma.user.delete({
      where: { id }
    });

    console.log('✅ Usuario eliminado');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Error eliminando usuario:', error);
    return NextResponse.json(
      { error: 'Error al eliminar usuario' },
      { status: 500 }
    );
  }
}
