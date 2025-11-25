// src/app/api/admin/clubs/[clubId]/instructors/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PUT - Actualizar instructor
export async function PUT(
  request: NextRequest,
  { params }: { params: { clubId: string; id: string } }
) {
  try {
    const { clubId, id } = params;
    const body = await request.json();

    const { name, email, specialty, hourlyRate, bio } = body;

    // Verificar que el instructor pertenece al club
    const existingInstructor = await prisma.instructor.findFirst({
      where: {
        id,
        clubId
      },
      include: {
        user: true
      }
    });

    if (!existingInstructor) {
      return NextResponse.json(
        { error: 'Instructor no encontrado o no pertenece a este club' },
        { status: 404 }
      );
    }

    // Si se está cambiando el email, verificar que no esté en uso
    if (email && email !== existingInstructor.user.email) {
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

    console.log('✏️ Actualizando instructor:', id);

    // Actualizar en transacción
    const result = await prisma.$transaction(async (tx) => {
      // Actualizar usuario si cambió nombre o email
      if (name || email) {
        await tx.user.update({
          where: { id: existingInstructor.userId },
          data: {
            ...(name && { name }),
            ...(email && { email })
          }
        });
      }

      // Actualizar instructor
      const updatedInstructor = await tx.instructor.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(specialty !== undefined && { specialties: specialty }),
          ...(hourlyRate !== undefined && { hourlyRate }),
          ...(bio !== undefined && { experience: bio })
        },
        include: {
          user: true
        }
      });

      return updatedInstructor;
    });

    console.log('✅ Instructor actualizado');

    return NextResponse.json({
      id: result.id,
      name: result.name,
      email: result.user.email,
      specialty: result.specialties,
      hourlyRate: result.hourlyRate,
      bio: result.experience,
      profilePictureUrl: result.user.profilePictureUrl,
      createdAt: result.createdAt
    });
  } catch (error) {
    console.error('❌ Error actualizando instructor:', error);
    return NextResponse.json(
      { error: 'Error al actualizar instructor' },
      { status: 500 }
    );
  }
}

// DELETE - Desactivar instructor (marcar como inactivo)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { clubId: string; id: string } }
) {
  try {
    const { clubId, id } = params;

    // Verificar que el instructor pertenece al club
    const existingInstructor = await prisma.instructor.findFirst({
      where: {
        id,
        clubId
      }
    });

    if (!existingInstructor) {
      return NextResponse.json(
        { error: 'Instructor no encontrado o no pertenece a este club' },
        { status: 404 }
      );
    }

    // Verificar si el instructor tiene clases asignadas en el futuro
    const futureClasses = await prisma.timeSlot.count({
      where: {
        instructorId: id,
        start: {
          gte: new Date()
        }
      }
    });

    if (futureClasses > 0) {
      return NextResponse.json(
        { error: `No se puede eliminar: el instructor tiene ${futureClasses} clase(s) futura(s) asignada(s)` },
        { status: 400 }
      );
    }

    console.log('🗑️ Desactivando instructor:', id);

    // Marcar instructor como inactivo (no eliminar)
    await prisma.instructor.update({
      where: { id },
      data: {
        isActive: false
      }
    });

    console.log('✅ Instructor desactivado');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Error desactivando instructor:', error);
    return NextResponse.json(
      { error: 'Error al desactivar instructor' },
      { status: 500 }
    );
  }
}
