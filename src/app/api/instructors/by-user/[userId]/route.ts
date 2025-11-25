// src/app/api/instructors/by-user/[userId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    const instructor = await prisma.instructor.findUnique({
      where: { userId },
    });

    if (!instructor) {
      return NextResponse.json(
        { error: 'Instructor not found for this user' },
        { status: 404 }
      );
    }

    return NextResponse.json(instructor);
  } catch (error) {
    console.error('Error fetching instructor by userId:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
