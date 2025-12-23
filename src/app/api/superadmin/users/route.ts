// src/app/api/superadmin/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Obtener todos los usuarios con filtros
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role'); // PLAYER, INSTRUCTOR, CLUB_ADMIN, SUPER_ADMIN
    const clubId = searchParams.get('clubId');
    const search = searchParams.get('search');

    let whereClause: any = {};

    if (role) {
      whereClause.role = role;
    }

    if (clubId) {
      whereClause.clubId = clubId;
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search } },
        { email: { contains: search } }
      ];
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      include: {
        club: {
          select: {
            id: true,
            name: true,
            address: true
          }
        },
        instructorProfile: {
          select: {
            id: true,
            specialties: true
          }
        },
        bookings: {
          select: {
            id: true,
            status: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Formatear respuesta
    const formattedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      profilePictureUrl: user.profilePictureUrl,
      phone: user.phone,
      level: user.level,
      position: user.position,
      gender: user.gender,
      role: user.role,
      clubId: user.clubId,
      clubName: user.club?.name || '',
      clubAddress: user.club?.address || '',
      credits: user.credits,
      blockedCredits: user.blockedCredits,
      points: user.points,
      preference: user.preference,
      visibility: user.visibility,
      bio: user.bio,
      genderCategory: user.genderCategory,
      preferredGameType: user.preferredGameType,
      isInstructor: !!user.instructorProfile,
      instructorSpecialties: user.instructorProfile?.specialties,
      bookingsCount: user.bookings?.length || 0,
      confirmedBookingsCount: user.bookings?.filter((b: any) => b.status === 'CONFIRMED').length || 0,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }));

    return NextResponse.json({ users: formattedUsers });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Error al obtener los usuarios' },
      { status: 500 }
    );
  }
}
