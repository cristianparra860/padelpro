// src/app/api/superadmin/instructors/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Obtener todos los instructores
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clubId = searchParams.get('clubId');

    let whereClause: any = {};

    if (clubId) {
      whereClause.clubId = clubId;
    }

    const instructors = await prisma.instructor.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            profilePictureUrl: true,
            phone: true,
            level: true,
            gender: true,
            credits: true
          }
        },
        club: {
          select: {
            id: true,
            name: true,
            address: true
          }
        },
        timeSlots: {
          select: {
            id: true,
            start: true,
            end: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const formattedInstructors = instructors.map(instructor => ({
      id: instructor.id,
      userId: instructor.userId,
      userName: instructor.user.name,
      userEmail: instructor.user.email,
      userPhone: instructor.user.phone,
      profilePictureUrl: instructor.user.profilePictureUrl,
      specialties: instructor.specialties,
      hourlyRate: instructor.hourlyRate,
      isAvailable: instructor.isAvailable,
      clubId: instructor.clubId,
      clubName: instructor.club.name,
      clubAddress: instructor.club.address,
      classesCount: instructor.timeSlots.length,
      createdAt: instructor.createdAt,
      updatedAt: instructor.updatedAt
    }));

    return NextResponse.json({ instructors: formattedInstructors });
  } catch (error) {
    console.error('Error fetching instructors:', error);
    return NextResponse.json(
      { error: 'Error al obtener los instructores' },
      { status: 500 }
    );
  }
}
