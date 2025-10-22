import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clubId = searchParams.get('clubId');
    const date = searchParams.get('date');

    // Query base para instructores
    let instructors;
    if (clubId) {
      instructors = await prisma.$queryRaw`
        SELECT * FROM Instructor WHERE clubId = ${clubId}
      `;
    } else {
      instructors = await prisma.$queryRaw`
        SELECT * FROM Instructor
      `;
    }

    return NextResponse.json(instructors);
  } catch (error) {
    console.error('Error fetching instructors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch instructors' },
      { status: 500 }
    );
  }
}
