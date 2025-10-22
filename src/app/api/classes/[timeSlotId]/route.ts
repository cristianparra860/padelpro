// src/app/api/classes/[timeSlotId]/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { timeSlotId: string } }
) {
  try {
    const classId = params.timeSlotId;

    const classData = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        instructor: {
          select: {
            id: true,
            name: true,
            email: true,
            photo: true,
            hourlyRate: true,
            specialties: true,
          }
        },
        court: {
          select: {
            id: true,
            number: true,
            name: true,
            clubId: true,
          }
        },
        bookings: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                photo: true,
              }
            }
          }
        }
      }
    });

    if (!classData) {
      return NextResponse.json(
        { error: 'Clase no encontrada' },
        { status: 404 }
      );
    }

    // Transformar a formato TimeSlot esperado por ClassCard
    const timeSlotData = {
      id: classData.id,
      start: classData.start.toISOString(),
      end: classData.end.toISOString(),
      instructorId: classData.instructorId,
      instructorName: classData.instructor.name,
      instructorPhoto: classData.instructor.photo,
      courtId: classData.courtId,
      courtNumber: classData.court?.number,
      clubId: classData.clubId,
      level: classData.level,
      category: classData.category,
      maxPlayers: classData.maxPlayers,
      playersCount: classData.bookings.length,
      totalPrice: classData.price,
      pricePerPerson: classData.pricePerPerson,
      status: classData.status,
      bookedPlayers: classData.bookings.map(booking => ({
        userId: booking.userId,
        userName: booking.user.name,
        userPhoto: booking.user.photo,
        spotNumber: booking.spotNumber,
        groupSize: booking.groupSize || 1,
        status: booking.status,
        createdAt: booking.createdAt.toISOString(),
      })),
    };

    return NextResponse.json(timeSlotData);
  } catch (error) {
    console.error('Error fetching class:', error);
    return NextResponse.json(
      { error: 'Error al cargar la clase' },
      { status: 500 }
    );
  }
}
