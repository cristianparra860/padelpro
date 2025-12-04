import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

/**
 * GET /api/user/preferences
 * Obtiene las preferencias del usuario autenticado
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = await getCurrentUser(request);

    if (!authUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        prefTimeSlot: true,
        prefViewType: true,
        prefPlayerCounts: true,
        prefInstructorIds: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      prefTimeSlot: user.prefTimeSlot || 'all',
      prefViewType: user.prefViewType || 'all',
      prefPlayerCounts: user.prefPlayerCounts || '1,2,3,4',
      prefInstructorIds: user.prefInstructorIds || '',
    });
  } catch (error) {
    console.error('Error getting user preferences:', error);
    return NextResponse.json(
      { error: 'Error al obtener preferencias del usuario' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/user/preferences
 * Actualiza las preferencias del usuario autenticado
 */
export async function PUT(request: NextRequest) {
  try {
    const authUser = await getCurrentUser(request);

    if (!authUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { prefTimeSlot, prefViewType, prefPlayerCounts, prefInstructorIds } = body;

    // Validar que al menos uno de los campos esté presente
    if (!prefTimeSlot && !prefViewType && !prefPlayerCounts && prefInstructorIds === undefined) {
      return NextResponse.json(
        { error: 'Debe proporcionar al menos una preferencia para actualizar' },
        { status: 400 }
      );
    }

    // Construir el objeto de actualización solo con los campos proporcionados
    const updateData: any = {};
    if (prefTimeSlot !== undefined) updateData.prefTimeSlot = prefTimeSlot;
    if (prefViewType !== undefined) updateData.prefViewType = prefViewType;
    if (prefPlayerCounts !== undefined) updateData.prefPlayerCounts = prefPlayerCounts;
    if (prefInstructorIds !== undefined) updateData.prefInstructorIds = prefInstructorIds;

    const updatedUser = await prisma.user.update({
      where: { id: authUser.id },
      data: updateData,
      select: {
        id: true,
        prefTimeSlot: true,
        prefViewType: true,
        prefPlayerCounts: true,
        prefInstructorIds: true,
      },
    });

    return NextResponse.json({
      message: 'Preferencias actualizadas correctamente',
      preferences: {
        prefTimeSlot: updatedUser.prefTimeSlot,
        prefViewType: updatedUser.prefViewType,
        prefPlayerCounts: updatedUser.prefPlayerCounts,
        prefInstructorIds: updatedUser.prefInstructorIds,
      },
    });
  } catch (error) {
    console.error('Error updating user preferences:', error);
    return NextResponse.json(
      { error: 'Error al actualizar preferencias del usuario' },
      { status: 500 }
    );
  }
}
