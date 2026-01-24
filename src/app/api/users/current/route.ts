import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

/**
 * GET /api/users/current
 * Obtiene los datos actuales del usuario autenticado desde JWT
 */
export async function GET(request: NextRequest) {
  try {
    // Obtener usuario desde el token JWT
    const authUser = await getCurrentUser(request);

    if (!authUser) {
      console.log('❌ No hay usuario autenticado');
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Buscar al usuario en la base de datos para datos actualizados
    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      include: { Club: true }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Convertir los datos de Prisma al formato User esperado
    const userData = {
      id: user.id,
      name: user.name,
      email: user.email || undefined,
      level: user.level as any,
      credit: user.credits || 0,
      credits: user.credits || 0,
      blockedCredits: user.blockedCredits || 0,
      points: user.points || 0,
      blockedPoints: user.blockedPoints || 0,
      loyaltyPoints: user.points || 0,
      profilePictureUrl: user.profilePictureUrl || undefined,
      genderCategory: user.genderCategory as any,
      favoriteInstructorIds: [],
      currentClubId: user.clubId || undefined,
      phone: user.phone || undefined,
      role: user.role,
      club: user.Club
    };

    console.log('✅ Usuario autenticado cargado:', {
      name: userData.name,
      email: userData.email,
      credits: userData.credits,
      role: userData.role,
      hasProfilePic: !!userData.profilePictureUrl,
      profilePicLength: userData.profilePictureUrl?.length,
      isBase64: userData.profilePictureUrl?.startsWith('data:image') ? 'SÍ' : 'NO'
    });

    return NextResponse.json({ user: userData });
  } catch (error) {
    console.error('❌ Error obteniendo usuario actual:', error);
    return NextResponse.json(
      { error: 'Error al obtener usuario' },
      { status: 500 }
    );
  }
}
