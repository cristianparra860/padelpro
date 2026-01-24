// src/app/api/instructors/[instructorId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ instructorId: string }> }
) {
  try {
    const { instructorId } = await params;

    const instructor = await prisma.instructor.findUnique({
      where: { id: instructorId },
      include: {
        Club: true
      }
    });

    if (!instructor) {
      return NextResponse.json({ error: 'Instructor no encontrado' }, { status: 404 });
    }

    return NextResponse.json(instructor);
  } catch (error) {
    console.error('Error fetching instructor:', error);
    return NextResponse.json({ error: 'Error al obtener instructor' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ instructorId: string }> }
) {
  console.log('🔵 PUT /api/instructors/[instructorId] - Inicio');

  try {
    const { instructorId } = await params;
    console.log('   instructorId:', instructorId);

    // Verificar autenticación
    let currentUser;
    try {
      currentUser = await getCurrentUser(request);
      console.log('   getCurrentUser resultado:', currentUser ? `Usuario: ${currentUser.id}` : 'null');
    } catch (authError: any) {
      console.error('   ❌ Error en getCurrentUser:', authError.message);
      return NextResponse.json({
        error: 'Error de autenticación',
        details: authError.message
      }, { status: 500 });
    }

    if (!currentUser) {
      console.log('   ❌ No autorizado - sin usuario');
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener el instructor
    let instructor;
    try {
      instructor = await prisma.instructor.findUnique({
        where: { id: instructorId }
      });
      console.log('   instructor encontrado:', instructor ? 'SI' : 'NO');
    } catch (dbError: any) {
      console.error('   ❌ Error buscando instructor:', dbError.message);
      return NextResponse.json({
        error: 'Error de base de datos',
        details: dbError.message
      }, { status: 500 });
    }

    if (!instructor) {
      console.log('   ❌ Instructor no encontrado');
      return NextResponse.json(
        { error: 'Instructor no encontrado' },
        { status: 404 }
      );
    }

    // Verificar permisos
    const isInstructor = instructor.userId === currentUser.id;
    const isClubAdmin = currentUser.role === 'CLUB_ADMIN' && currentUser.clubId === instructor.clubId;
    const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';
    console.log('   permisos - isInstructor:', isInstructor, 'isClubAdmin:', isClubAdmin, 'isSuperAdmin:', isSuperAdmin);

    if (!isInstructor && !isClubAdmin && !isSuperAdmin) {
      console.log('   ❌ No autorizado - sin permisos');
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    let body;
    try {
      body = await request.json();
      console.log('   body recibido:', JSON.stringify(body));
    } catch (jsonError: any) {
      console.error('   ❌ Error parseando JSON:', jsonError.message);
      return NextResponse.json({
        error: 'JSON inválido',
        details: jsonError.message
      }, { status: 400 });
    }

    // Preparar datos para actualizar
    const updateData: any = {};

    if (body.isAvailable !== undefined) {
      updateData.isAvailable = body.isAvailable;
    }

    if (body.defaultRatePerHour !== undefined) {
      updateData.defaultRatePerHour = body.defaultRatePerHour;
    }

    if (body.rateTiers !== undefined) {
      updateData.rateTiers = JSON.stringify(body.rateTiers);
    }

    if (body.unavailableHours !== undefined) {
      console.log('   📅 Actualizando unavailableHours:', JSON.stringify(body.unavailableHours));
      updateData.unavailableHours = JSON.stringify(body.unavailableHours);
    }

    console.log('   updateData final:', JSON.stringify(updateData));

    // Actualizar instructor
    let updatedInstructor;
    try {
      updatedInstructor = await prisma.instructor.update({
        where: { id: instructorId },
        data: updateData,
        include: {
          User: {
            select: {
              id: true,
              name: true,
              email: true,
              profilePictureUrl: true,
              level: true
            }
          },
          Club: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });
      console.log('   ✅ Instructor actualizado exitosamente');
    } catch (updateError: any) {
      console.error('   ❌ Error actualizando instructor:', updateError.message);
      console.error('   Stack:', updateError.stack);
      return NextResponse.json({
        error: 'Error actualizando instructor',
        details: updateError.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      instructor: {
        ...updatedInstructor,
        rateTiers: updatedInstructor.rateTiers ? JSON.parse(updatedInstructor.rateTiers) : [],
        unavailableHours: updatedInstructor.unavailableHours ? JSON.parse(updatedInstructor.unavailableHours) : {},
        levelRanges: updatedInstructor.levelRanges ? JSON.parse(updatedInstructor.levelRanges) : []
      }
    });
  } catch (error: any) {
    console.error('❌ ERROR GENERAL en PUT /api/instructors/[instructorId]:', error);
    console.error('   Mensaje:', error.message);
    console.error('   Stack:', error.stack);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}
