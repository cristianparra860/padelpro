import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Mapeo de slug a clubId (esto debería estar en la BD eventualmente)
const CLUB_SLUG_MAP: Record<string, string> = {
  'estrella': 'padel-estrella-madrid',
  'padel-estrella-madrid': 'padel-estrella-madrid',
  'casillas': 'club-1',
  'club-1': 'club-1',
  'madrid-centro': 'cmjhhbsgs0003tgbouv0urmtl',
  'barcelona': 'cmjhhbsgz0005tgbojl3qwva5',
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    console.log(`🏢 Fetching club config for slug: ${slug}`);

    // Buscar el clubId correspondiente al slug
    const clubId = CLUB_SLUG_MAP[slug];

    if (!clubId) {
      return NextResponse.json(
        { error: `Club slug "${slug}" no encontrado` },
        { status: 404 }
      );
    }

    // Obtener datos del club
    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        email: true,
        openingHours: true,
        // Agregar campos personalizados si existen
      },
    });

    if (!club) {
      return NextResponse.json(
        { error: `Club con ID "${clubId}" no encontrado` },
        { status: 404 }
      );
    }

    // Configuración específica por club
    const clubConfig = {
      id: club.id,
      slug: slug,
      name: club.name,
      address: club.address,
      phone: club.phone,
      email: club.email,
      openingHours: club.openingHours,
      // Configuración de tema por club
      logo: getClubLogo(slug),
      primaryColor: getClubPrimaryColor(slug),
      theme: getClubTheme(slug),
    };

    return NextResponse.json(clubConfig);

  } catch (error: any) {
    console.error('❌ Error fetching club config:', error);
    return NextResponse.json(
      { error: 'Error al cargar configuración del club', details: error.message },
      { status: 500 }
    );
  }
}

// Funciones helper para configuración por club
function getClubLogo(slug: string): string | undefined {
  const logos: Record<string, string> = {
    'estrella': '/logos/estrella.png',
    'casillas': '/logos/casillas.png',
    'demo': '/logos/demo.png',
  };
  return logos[slug];
}

function getClubPrimaryColor(slug: string): string {
  const colors: Record<string, string> = {
    'estrella': '#FFD700', // Dorado
    'casillas': '#0066CC', // Azul
    'demo': '#10B981',     // Verde
  };
  return colors[slug] || '#10B981';
}

function getClubTheme(slug: string): Record<string, any> {
  // Aquí puedes definir temas completos por club
  return {
    borderRadius: '8px',
    fontFamily: 'system-ui',
  };
}
