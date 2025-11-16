import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/users/current
 * Obtiene los datos actuales del usuario desde la base de datos
 * y sincroniza con el estado en memoria
 */
export async function GET(request: NextRequest) {
  try {
    // Buscar al usuario Alex García por email
    const user = await prisma.user.findUnique({
      where: {
        email: 'alex@example.com'
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Convertir los datos de Prisma al formato User esperado
    // IMPORTANTE: Dividir entre 100 porque la BD almacena en centavos
    const userData = {
      id: user.id,
      name: user.name,
      email: user.email || undefined,
      level: user.level as any,
      credit: (user.credits || 0) / 100, // Convertir centavos a euros
      credits: (user.credits || 0) / 100, // Convertir centavos a euros
      blockedCredits: (user.blockedCredits || 0) / 100, // Convertir centavos a euros
      points: user.points || 0,
      loyaltyPoints: user.points || 0, // Alias para compatibilidad
      profilePictureUrl: user.profilePictureUrl || undefined,
      genderCategory: user.genderCategory as any,
      favoriteInstructorIds: [],
      currentClubId: user.clubId || undefined,
      phone: user.phone || undefined
    };

    console.log('✅ Usuario cargado desde BD:', {
      name: userData.name,
      credits: userData.credits,
      blockedCredits: userData.blockedCredits,
      points: userData.points,
      email: userData.email
    });

    return NextResponse.json(userData);
  } catch (error) {
    console.error('❌ Error obteniendo usuario actual:', error);
    return NextResponse.json(
      { error: 'Error al obtener usuario' },
      { status: 500 }
    );
  }
}
