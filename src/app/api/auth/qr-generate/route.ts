import { prisma } from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 60000); // 60 segundos

    await prisma.qRSession.create({
      data: {
        token,
        status: 'pending',
        expiresAt
      }
    });

    return NextResponse.json({ token, expiresAt });
  } catch (error) {
    console.error('Error generating QR token:', error);
    return NextResponse.json({ error: 'Failed to generate QR token' }, { status: 500 });
  }
}
