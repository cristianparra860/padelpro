// src/app/api/clubs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    console.log('📋 /api/clubs - Obteniendo clubes de la base de datos');

    // Obtener clubes reales de la base de datos
    const clubs = await prisma.club.findMany({
      orderBy: {
        name: 'asc'
      }
    });

    // Mapear los datos de la BD al formato esperado por el frontend
    const formattedClubs = clubs.map(club => {
      console.log(`🏢 Club ${club.name}:`, {
        hasLogo: !!club.logo,
        logoLength: club.logo?.length || 0,
        hasHeroImage: !!club.heroImage,
        heroImageLength: club.heroImage?.length || 0
      });

      return {
        id: club.id,
        name: club.name,
        location: club.address,
        logoUrl: club.logo || null,
        heroImage: club.heroImage || null,
        showClassesTabOnFrontend: true,
        showMatchesTabOnFrontend: true,
        isMatchDayEnabled: false,
        isMatchProEnabled: false,
        isStoreEnabled: false,
        cardShadowEffect: {
          enabled: true,
          color: '#3B82F6',
          intensity: 0.3,
        },
        // Información adicional del club
        email: club.email,
        phone: club.phone,
        website: club.website,
        description: club.description,
        // Agregar timestamp para evitar caché
        _updated: club.updatedAt?.getTime() || Date.now()
      };
    });

    console.log(`✅ Devolviendo ${formattedClubs.length} clubes`);

    return NextResponse.json(formattedClubs);
  } catch (error) {
    console.error('Error fetching clubs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clubs' },
      { status: 500 }
    );
  }
}