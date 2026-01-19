import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Obtener preferencias del usuario
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        prefTimeSlot: true,
        prefViewType: true,
        prefPlayerCounts: true,
        prefInstructorIds: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Parsear las preferencias
    const preferences = {
      timeSlotFilter: user.prefTimeSlot || 'all',
      viewPreference: user.prefViewType || 'all',
      playerCounts: user.prefPlayerCounts
        ? user.prefPlayerCounts.split(',').map(Number)
        : [1, 2, 3, 4],
      instructorIds: user.prefInstructorIds
        ? user.prefInstructorIds.split(',')
        : [],
    };

    return NextResponse.json(preferences);
  } catch (error) {
    console.error('Error al obtener preferencias:', error);
    return NextResponse.json({ error: 'Error al obtener preferencias' }, { status: 500 });
  }
}

// PUT - Actualizar preferencias del usuario
export async function PUT(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;
    const body = await request.json();

    const { timeSlotFilter, viewPreference, playerCounts, instructorIds } = body;

    // Convertir arrays a CSV strings
    const prefPlayerCounts = Array.isArray(playerCounts)
      ? playerCounts.join(',')
      : '1,2,3,4';

    const prefInstructorIds = Array.isArray(instructorIds)
      ? instructorIds.join(',')
      : '';

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        prefTimeSlot: timeSlotFilter || 'all',
        prefViewType: viewPreference || 'all',
        prefPlayerCounts,
        prefInstructorIds,
      },
      select: {
        id: true,
        prefTimeSlot: true,
        prefViewType: true,
        prefPlayerCounts: true,
        prefInstructorIds: true,
      },
    });

    return NextResponse.json({
      success: true,
      preferences: {
        timeSlotFilter: updatedUser.prefTimeSlot,
        viewPreference: updatedUser.prefViewType,
        playerCounts: updatedUser.prefPlayerCounts?.split(',').map(Number) || [1, 2, 3, 4],
        instructorIds: updatedUser.prefInstructorIds?.split(',').filter(Boolean) || [],
      },
    });
  } catch (error) {
    console.error('Error al actualizar preferencias:', error);
    return NextResponse.json({ error: 'Error al actualizar preferencias' }, { status: 500 });
  }
}
