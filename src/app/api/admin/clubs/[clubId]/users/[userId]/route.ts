// src/app/api/admin/clubs/[clubId]/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PUT - Actualizar usuario
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string; userId: string }> }
) {
  try {
    const { clubId, userId } = await params;
    const body = await request.json();

    const { name, email, level, genderCategory, credits, points, loyaltyPoints } = body;

    console.log('✏️ Actualizando usuario:', userId, 'con datos:', body);

    // Verificar que el usuario pertenece al club
    const existingUser = await prisma.user.findFirst({
      where: {
        id: userId,
        clubId
      }
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: 'Usuario no encontrado o no pertenece a este club' },
        { status: 404 }
      );
    }

    // Si se está cambiando el email, verificar que no esté en uso por OTRO usuario
    if (email && email !== existingUser.email) {
      const emailInUse = await prisma.user.findFirst({
        where: {
          email,
          NOT: { id: userId }
        }
      });

      if (emailInUse) {
        console.log('❌ Email ya en uso por otro usuario');
        return NextResponse.json(
          { error: 'El email ya está en uso' },
          { status: 400 }
        );
      }
    }

    // Actualizar usuario
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(level && { level }),
        ...(genderCategory !== undefined && { genderCategory }),
        ...(credits !== undefined && { credits: Number(credits) }),
        ...(points !== undefined && { points: Number(points) }),
        ...(loyaltyPoints !== undefined && { points: Number(loyaltyPoints) })
      }
    });

    console.log('✅ Usuario actualizado exitosamente:', updatedUser.name);

    return NextResponse.json(updatedUser);
  } catch (error: any) {
    console.error('❌ Error actualizando usuario:', error);
    
    // Manejar errores específicos de Prisma
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'El email ya está en uso' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Error al actualizar usuario' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar usuario
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string; userId: string }> }
) {
  try {
    const { clubId, userId } = await params;

    // Verificar que el usuario pertenece al club
    const existingUser = await prisma.user.findFirst({
      where: {
        id: userId,
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
        userId: userId,
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

    console.log('🗑️ Eliminando usuario:', userId);

    // Eliminar usuario
    await prisma.user.delete({
      where: { id: userId }
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
