import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ instructorId: string }> }
) {
  try {
    const { instructorId } = await params;

    console.log('📝 Actualizando rangos de nivel del instructor:', instructorId);

    // Verificar autenticación
    const currentUser = await getCurrentUser(request);

    if (!currentUser) {
      console.log('❌ No hay usuario autenticado');
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    console.log('✅ Usuario autenticado:', currentUser.id);

    // Verificar que el usuario sea el instructor o admin
    const instructor = await prisma.instructor.findUnique({
      where: { id: instructorId },
      include: { User: true }
    });

    if (!instructor) {
      return NextResponse.json({ error: 'Instructor no encontrado' }, { status: 404 });
    }

    // Verificar permisos: debe ser el instructor mismo o un admin del mismo club
    const isInstructor = instructor.userId === currentUser.id;
    const isClubAdmin = currentUser.role === 'CLUB_ADMIN' && currentUser.clubId === instructor.clubId;
    const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';

    if (!isInstructor && !isClubAdmin && !isSuperAdmin) {
      console.log('❌ Usuario no tiene permisos para modificar este instructor');
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { levelRanges } = body;

    console.log('📝 Rangos a actualizar:', levelRanges);

    // Validar formato
    if (!Array.isArray(levelRanges)) {
      return NextResponse.json({ error: 'levelRanges debe ser un array' }, { status: 400 });
    }

    // Validar cada rango
    for (const range of levelRanges) {
      if (typeof range.minLevel !== 'number' || typeof range.maxLevel !== 'number') {
        return NextResponse.json({ error: 'minLevel y maxLevel deben ser números' }, { status: 400 });
      }
      if (range.minLevel < 0 || range.minLevel > 7.0) {
        return NextResponse.json({ error: 'Los niveles deben estar entre 0.0 y 7.0' }, { status: 400 });
      }
      if (range.maxLevel < 0 || range.maxLevel > 7.0) {
        return NextResponse.json({ error: 'Los niveles deben estar entre 0.0 y 7.0' }, { status: 400 });
      }
      if (range.minLevel >= range.maxLevel) {
        return NextResponse.json({ error: 'minLevel debe ser menor que maxLevel' }, { status: 400 });
      }
    }

    // Convertir a JSON string para guardar en la DB
    const levelRangesJson = JSON.stringify(levelRanges);

    console.log('💾 Guardando en base de datos...');

    // Actualizar instructor
    const updatedInstructor = await prisma.instructor.update({
      where: { id: instructorId },
      data: { levelRanges: levelRangesJson }
    });

    console.log('✅ Rangos de nivel actualizados correctamente');

    return NextResponse.json({
      success: true,
      instructor: {
        ...updatedInstructor,
        levelRanges: JSON.parse(updatedInstructor.levelRanges || '[]')
      }
    });

  } catch (error: any) {
    console.error('❌ Error updating instructor level ranges:', error);
    console.error('📋 Stack:', error.stack);

    return NextResponse.json({
      error: 'Error al actualizar rangos de nivel',
      details: error.message
    }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ instructorId: string }> }
) {
  try {
    const { instructorId } = await params;

    const instructor = await prisma.instructor.findUnique({
      where: { id: instructorId },
      select: { levelRanges: true }
    });

    if (!instructor) {
      return NextResponse.json({ error: 'Instructor no encontrado' }, { status: 404 });
    }

    const levelRanges = instructor.levelRanges
      ? JSON.parse(instructor.levelRanges)
      : [];

    return NextResponse.json({
      success: true,
      levelRanges
    });

  } catch (error: any) {
    console.error('❌ Error getting instructor level ranges:', error);

    return NextResponse.json({
      error: 'Error al obtener rangos de nivel',
      details: error.message
    }, { status: 500 });
  }
}
