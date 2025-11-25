import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'padelpro-secret-key-change-in-production';

export async function PUT(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;
    const token = request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    
    if (decoded.userId !== userId) {
      return NextResponse.json({ error: 'No autorizado para actualizar este perfil' }, { status: 403 });
    }

    const { profilePictureUrl } = await request.json();

    if (!profilePictureUrl) {
      return NextResponse.json({ error: 'profilePictureUrl es requerido' }, { status: 400 });
    }

    console.log(`📸 Actualizando foto de perfil para usuario ${userId}`);
    console.log(`📏 Tamaño de la imagen: ${Math.round(profilePictureUrl.length / 1024)} KB`);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { profilePictureUrl },
      select: {
        id: true,
        name: true,
        email: true,
        profilePictureUrl: true,
        level: true,
        position: true,
        role: true
      }
    });

    console.log(`✅ Foto de perfil actualizada exitosamente para ${updatedUser.name}`);

    return NextResponse.json({
      success: true,
      user: updatedUser
    });

  } catch (error: any) {
    console.error('❌ Error al actualizar foto de perfil:', error);
    return NextResponse.json(
      { 
        error: 'Error al actualizar foto de perfil',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
