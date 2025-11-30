// src/app/api/instructors/[instructorId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ instructorId: string }> }
) {
  try {
    const { instructorId } = await params;
    
    // Verificar autenticación
    const currentUser = await getCurrentUser(request);
    
    if (!currentUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener el instructor
    const instructor = await prisma.instructor.findUnique({
      where: { id: instructorId }
    });

    if (!instructor) {
      return NextResponse.json(
        { error: 'Instructor no encontrado' },
        { status: 404 }
      );
    }
    
    // Verificar permisos
    const isInstructor = instructor.userId === currentUser.id;
    const isClubAdmin = currentUser.role === 'CLUB_ADMIN' && currentUser.clubId === instructor.clubId;
    const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';

    if (!isInstructor && !isClubAdmin && !isSuperAdmin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    
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
      updateData.unavailableHours = JSON.stringify(body.unavailableHours);
    }

    // Actualizar instructor
    const updatedInstructor = await prisma.instructor.update({
      where: { id: instructorId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePictureUrl: true,
            level: true
          }
        },
        club: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

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
    console.error('Error updating instructor:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}
