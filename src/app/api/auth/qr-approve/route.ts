import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();
    const authToken = request.headers.get('authorization')?.replace('Bearer ', '');

    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Obtener usuario actual desde el token
    const userRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002'}/api/users/current`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (!userRes.ok) {
      return NextResponse.json({ error: 'Invalid auth token' }, { status: 401 });
    }

    const userData = await userRes.json();
    const userId = userData.user?.id || userData.id;

    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verificar que la sesión QR existe y está pendiente
    const session = await prisma.qRSession.findUnique({
      where: { token }
    });

    if (!session) {
      return NextResponse.json({ error: 'QR session not found' }, { status: 404 });
    }

    if (session.status !== 'pending') {
      return NextResponse.json({ error: 'QR session already used or expired' }, { status: 400 });
    }

    // Actualizar sesión QR
    await prisma.qRSession.update({
      where: { token },
      data: {
        status: 'approved',
        userId,
        authToken
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error approving QR session:', error);
    return NextResponse.json({ error: 'Failed to approve QR session' }, { status: 500 });
  }
}
