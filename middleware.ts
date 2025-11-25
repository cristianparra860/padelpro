// middleware.ts (en la raíz del proyecto)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

// Rutas que requieren autenticación
const protectedRoutes = [
  '/dashboard',
  '/classes',
  '/bookings',
  '/profile',
  '/admin'
];

// Rutas públicas (accesibles sin login)
const publicRoutes = [
  '/',
  '/login',
  '/register',
  '/activities'
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Obtener token de la cookie
  const token = request.cookies.get('auth_token')?.value;

  // Verificar si la ruta requiere autenticación
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  );

  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(route)
  );

  // Si es ruta protegida y no hay token válido, redirigir a login
  if (isProtectedRoute) {
    if (!token) {
      console.log('🔒 Acceso denegado sin token:', pathname);
      const loginUrl = new URL('/', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Verificar que el token sea válido
    const payload = verifyToken(token);
    if (!payload) {
      console.log('🔒 Token inválido, redirigiendo a login:', pathname);
      const loginUrl = new URL('/', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Si es ruta de admin, verificar rol
    if (pathname.startsWith('/admin')) {
      const allowedRoles = ['CLUB_ADMIN', 'SUPER_ADMIN'];
      if (!allowedRoles.includes(payload.role)) {
        console.log('🚫 Acceso denegado a admin para rol:', payload.role);
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }
  }

  // Si ya está logueado y intenta acceder a login/register, redirigir a dashboard
  if (token && (pathname === '/' || pathname === '/login' || pathname === '/register')) {
    const payload = verifyToken(token);
    if (payload) {
      console.log('✅ Usuario ya autenticado, redirigiendo a dashboard');
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

// Configurar en qué rutas se ejecuta el middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes (handled separately)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|public).*)',
  ],
};
