import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clubId = searchParams.get('clubId');
    const date = searchParams.get('date');

    console.log('🔍 GET /api/instructors - clubId:', clubId, 'date:', date);

    // Query con JOIN para obtener datos del usuario
    let instructors;
    if (clubId) {
      console.log('📊 Filtrando instructores por clubId:', clubId);

      // Si hay fecha, mostramos SOLO los instructores que tengan clases ese día (activos o inactivos)
      if (date) {
        console.log('📅 Fecha especificada:', date, '- Filtrando estrictamente por clases en esta fecha');
        const searchDate = new Date(date);
        const startOfDay = searchDate.getTime();
        const endOfDay = startOfDay + 86400000;

        instructors = await prisma.$queryRaw`
          SELECT DISTINCT
            i.id,
            i.userId,
            i.clubId,
            i.name,
            i.specialties,
            i.experience,
            i.hourlyRate,
            i.profilePictureUrl,
            i.isActive,
            u.name as userName,
            u.email,
            u.profilePictureUrl as userProfilePicture
          FROM Instructor i
          LEFT JOIN User u ON i.userId = u.id
          JOIN TimeSlot ts ON i.id = ts.instructorId
          WHERE i.clubId = ${clubId} 
          AND ts.start >= ${startOfDay} AND ts.start < ${endOfDay}
          ORDER BY i.name ASC
        `;
      } else {
        // Comportamiento original: solo activos
        instructors = await prisma.$queryRaw`
          SELECT 
            i.id,
            i.userId,
            i.clubId,
            i.name,
            i.specialties,
            i.experience,
            i.hourlyRate,
            i.profilePictureUrl,
            i.isActive,
            u.name as userName,
            u.email,
            u.profilePictureUrl as userProfilePicture
          FROM Instructor i
          LEFT JOIN User u ON i.userId = u.id
          WHERE i.clubId = ${clubId} AND i.isActive = 1
          ORDER BY i.name ASC
        `;
      }
    } else {
      console.log('📊 Obteniendo TODOS los instructores activos (sin filtro de club)');
      instructors = await prisma.$queryRaw`
        SELECT 
          i.id,
          i.userId,
          i.clubId,
          i.name,
          i.specialties,
          i.experience,
          i.hourlyRate,
          i.profilePictureUrl,
          i.isActive,
          u.name as userName,
          u.email,
          u.profilePictureUrl as userProfilePicture
        FROM Instructor i
        LEFT JOIN User u ON i.userId = u.id
        WHERE i.isActive = 1
        ORDER BY i.name ASC
      `;
    }

    console.log('✅ Instructores encontrados:', instructors.length);
    if (instructors.length > 0) {
      console.log('📋 Nombres:', instructors.map((i: any) => i.name || i.userName).join(', '));
    }

    // Mapear los datos para usar el nombre del usuario si el instructor no tiene nombre
    const formattedInstructors = instructors.map((inst: any) => ({
      id: inst.id,
      userId: inst.userId,
      clubId: inst.clubId,
      name: inst.name || inst.userName || 'Instructor',
      specialties: inst.specialties,
      experience: inst.experience,
      hourlyRate: inst.hourlyRate,
      profilePictureUrl: inst.profilePictureUrl || inst.userProfilePicture,
      isActive: inst.isActive,
      email: inst.email
    }));

    return NextResponse.json(formattedInstructors);
  } catch (error) {
    console.error('Error fetching instructors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch instructors' },
      { status: 500 }
    );
  }
}
