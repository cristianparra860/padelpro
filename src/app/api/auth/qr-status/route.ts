import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');
    
    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }

    const session = await prisma.qRSession.findUnique({
      where: { token }
    });

    if (!session) {
      return NextResponse.json({ status: 'expired' });
    }

    // Verificar expiración
    if (new Date() > session.expiresAt) {
      await prisma.qRSession.update({
        where: { id: session.id },
        data: { status: 'expired' }
      });
      return NextResponse.json({ status: 'expired' });
    }

    return NextResponse.json({
      status: session.status,
      userId: session.userId,
      authToken: session.authToken
    });
  } catch (error) {
    console.error('Error checking QR status:', error);
    return NextResponse.json({ error: 'Failed to check QR status' }, { status: 500 });
  }
}
