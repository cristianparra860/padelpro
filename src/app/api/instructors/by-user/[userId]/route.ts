// src/app/api/instructors/by-user/[userId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    
    console.log('🔍 Buscando instructor para usuario:', userId);
    
    // Verificar autenticación
    const currentUser = await getCurrentUser(request);
    
    if (!currentUser) {
      console.log('❌ No hay usuario autenticado');
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const instructor = await prisma.instructor.findUnique({
      where: { userId },
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

    if (!instructor) {
      console.log('ℹ️ Usuario no es instructor');
      return NextResponse.json(
        { success: false, isInstructor: false },
        { status: 200 }
      );
    }
    
    // Verificar permisos
    const isInstructor = instructor.userId === currentUser.id;
    const isClubAdmin = currentUser.role === 'CLUB_ADMIN' && currentUser.clubId === instructor.clubId;
    const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';

    if (!isInstructor && !isClubAdmin && !isSuperAdmin) {
      console.log('❌ Usuario no tiene permisos');
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    console.log('✅ Instructor encontrado:', instructor.id);

    return NextResponse.json({
      success: true,
      isInstructor: true,
      instructor: {
        ...instructor,
        levelRanges: instructor.levelRanges ? JSON.parse(instructor.levelRanges) : []
      }
    });
  } catch (error: any) {
    console.error('Error fetching instructor by userId:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
