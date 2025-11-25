// src/app/api/users/me/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

/**
 * GET /api/users/me
 * Obtiene los datos del usuario autenticado mediante JWT
 * Esta es la versión protegida con JWT del endpoint /api/users/current
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Convertir al formato esperado por el frontend
    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      level: user.level,
      credit: user.credits,
      credits: user.credits,
      blockedCredits: user.blockedCredits,
      points: user.points,
      loyaltyPoints: user.points,
      profilePictureUrl: user.profilePictureUrl || undefined,
      genderCategory: user.genderCategory,
      favoriteInstructorIds: [],
      currentClubId: user.clubId,
      phone: user.phone || undefined,
      role: user.role,
      club: user.club
    };

    console.log('✅ Usuario autenticado cargado:', {
      name: userData.name,
      email: userData.email,
      role: userData.role
    });

    return NextResponse.json(userData);
  } catch (error) {
    console.error('❌ Error obteniendo usuario autenticado:', error);
    return NextResponse.json(
      { error: 'Error al obtener usuario' },
      { status: 500 }
    );
  }
}
