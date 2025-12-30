import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        prefTimeSlot: true,
        prefViewType: true,
        prefPlayerCounts: true,
        prefInstructorIds: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Convertir strings CSV a arrays
    const preferences = {
      timeSlot: user.prefTimeSlot || 'all',
      viewType: user.prefViewType || 'all',
      playerCounts: user.prefPlayerCounts ? user.prefPlayerCounts.split(',').map(Number) : [],
      instructorIds: user.prefInstructorIds ? user.prefInstructorIds.split(',') : []
    };

    return NextResponse.json(preferences);
  } catch (error) {
    console.error('Error al obtener preferencias:', error);
    return NextResponse.json({ error: 'Error al obtener preferencias' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 });
    }

    const { timeSlot, viewType, playerCounts, instructorIds, type } = await request.json();

    // Convertir arrays a CSV para guardar en BD
    const prefPlayerCounts = playerCounts && playerCounts.length > 0 
      ? playerCounts.join(',') 
      : '1,2,3,4';
    const prefInstructorIds = instructorIds && instructorIds.length > 0 
      ? instructorIds.join(',') 
      : null;

    await prisma.user.update({
      where: { id: userId },
      data: {
        prefTimeSlot: timeSlot || 'all',
        prefViewType: viewType || 'all',
        prefPlayerCounts,
        prefInstructorIds
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: `Filtros ${type === 'classes' ? 'de clases' : 'de partidas'} guardados correctamente` 
    });
  } catch (error) {
    console.error('Error al guardar preferencias:', error);
    return NextResponse.json({ error: 'Error al guardar preferencias' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 });
    }

    // Restaurar a valores por defecto
    await prisma.user.update({
      where: { id: userId },
      data: {
        prefTimeSlot: 'all',
        prefViewType: 'all',
        prefPlayerCounts: '1,2,3,4',
        prefInstructorIds: null
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Filtros eliminados correctamente' 
    });
  } catch (error) {
    console.error('Error al eliminar preferencias:', error);
    return NextResponse.json({ error: 'Error al eliminar preferencias' }, { status: 500 });
  }
}
