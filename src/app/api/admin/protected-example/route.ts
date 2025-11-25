// src/app/api/admin/protected-example/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';

/**
 * GET /api/admin/protected-example
 * Ejemplo de endpoint protegido que requiere rol de administrador
 */
export async function GET(request: NextRequest) {
  // Validar que el usuario tiene rol de admin
  const authResult = await requireRole(request, ['CLUB_ADMIN', 'SUPER_ADMIN']);

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  const { user } = authResult;

  console.log('✅ Admin autenticado:', user.email, '- Role:', user.role);

  // Aquí va la lógica del endpoint para admins
  return NextResponse.json({
    success: true,
    message: 'Acceso concedido a área de administrador',
    user: {
      name: user.name,
      email: user.email,
      role: user.role
    },
    data: {
      // Datos sensibles solo para admins
      totalUsers: 42,
      totalBookings: 156,
      revenue: 3250.50
    }
  });
}
