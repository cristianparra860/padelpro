import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Lista de clubes válidos (esto podría venir de una BD en el futuro)
const VALID_CLUBS = ['estrella', 'padel-estrella-madrid', 'casillas', 'club-1', 'madrid-centro', 'barcelona'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware para rutas públicas, API y rutas de la aplicación principal
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/clubs') ||
    pathname.startsWith('/club-selector') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/superadmin') ||
    pathname.startsWith('/reservar') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/bookings') ||
    pathname.startsWith('/my-bookings') ||
    pathname.startsWith('/instructor') ||
    pathname.startsWith('/instructors') ||
    pathname.startsWith('/store') ||
    pathname.startsWith('/play') ||
    pathname.startsWith('/matches') ||
    pathname.startsWith('/movimientos') ||
    pathname.startsWith('/add-class') ||
    pathname.startsWith('/calendario') ||
    pathname.startsWith('/debug') ||
    pathname.startsWith('/test') ||
    pathname.startsWith('/simple') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Detectar si ya tiene un club slug en la ruta
  const pathSegments = pathname.split('/').filter(Boolean);
  const potentialClubSlug = pathSegments[0];

  // Si la ruta comienza con un club válido, permitir continuar
  if (VALID_CLUBS.includes(potentialClubSlug)) {
    // Agregar header con el clubSlug para usar en las páginas
    const response = NextResponse.next();
    response.headers.set('x-club-slug', potentialClubSlug);
    return response;
  }

  // Para cualquier otra ruta sin club slug, permitir pasar
  // (la autenticación se maneja en las páginas individuales)
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*$).*)',
  ],
};
