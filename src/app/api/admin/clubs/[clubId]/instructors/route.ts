// src/app/api/admin/clubs/[clubId]/instructors/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Obtener todos los instructores del club
export async function GET(
  request: NextRequest,
  { params }: { params: { clubId: string } }
) {
  try {
    const { clubId } = params;

    console.log('🔍 Obteniendo instructores del club:', clubId);

    // Obtener instructores con datos del usuario relacionado
    const instructors = await prisma.instructor.findMany({
      where: {
        clubId: clubId,
        isActive: true
      },
      include: {
        user: {
          select: {
            email: true,
            profilePictureUrl: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    console.log(`✅ ${instructors.length} instructores encontrados`);

    // Mapear a formato esperado por el componente
    const formattedInstructors = instructors.map(instructor => ({
      id: instructor.id,
      name: instructor.name,
      email: instructor.user.email,
      specialty: instructor.specialties || 'Padel General',
      hourlyRate: instructor.hourlyRate || 25.0,
      bio: instructor.experience || '',
      profilePictureUrl: instructor.user.profilePictureUrl,
      createdAt: instructor.createdAt
    }));

    return NextResponse.json(formattedInstructors);
  } catch (error) {
    console.error('❌ Error obteniendo instructores:', error);
    return NextResponse.json(
      { error: 'Error al obtener instructores' },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo instructor (crear usuario + instructor)
export async function POST(
  request: NextRequest,
  { params }: { params: { clubId: string } }
) {
  try {
    const { clubId } = params;
    const body = await request.json();

    const { name, email, specialty, hourlyRate, bio } = body;

    // Validaciones
    if (!name || !email) {
      return NextResponse.json(
        { error: 'Nombre y email son requeridos' },
        { status: 400 }
      );
    }

    // Verificar que el email no esté en uso
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'El email ya está en uso' },
        { status: 400 }
      );
    }

    console.log('➕ Creando instructor:', { name, email, clubId });

    // Crear usuario e instructor en transacción
    const result = await prisma.$transaction(async (tx) => {
      // 1. Crear usuario
      const newUser = await tx.user.create({
        data: {
          name,
          email,
          clubId,
          role: 'INSTRUCTOR',
          level: 'avanzado',
          credits: 0,
          blockedCredits: 0,
          points: 0
        }
      });

      // 2. Crear instructor vinculado al usuario
      const newInstructor = await tx.instructor.create({
        data: {
          userId: newUser.id,
          name,
          clubId,
          specialties: specialty || 'Padel General',
          hourlyRate: hourlyRate || 25.0,
          experience: bio || '',
          isActive: true
        }
      });

      return { instructor: newInstructor, user: newUser };
    });

    console.log('✅ Instructor creado:', result.instructor.id);

    return NextResponse.json({
      id: result.instructor.id,
      name: result.instructor.name,
      email: result.user.email,
      specialty: result.instructor.specialties,
      hourlyRate: result.instructor.hourlyRate,
      bio: result.instructor.experience,
      profilePictureUrl: result.user.profilePictureUrl,
      createdAt: result.instructor.createdAt
    }, { status: 201 });
  } catch (error) {
    console.error('❌ Error creando instructor:', error);
    return NextResponse.json(
      { error: 'Error al crear instructor' },
      { status: 500 }
    );
  }
}
