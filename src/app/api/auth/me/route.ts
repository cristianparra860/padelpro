// src/app/api/auth/me/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

/**
 * GET /api/auth/me
 * Retorna el usuario actual basado en el token JWT
 */
export async function GET(request: NextRequest) {
  console.log('👤 /api/auth/me GET received');

  try {
    const user = await getCurrentUser(request);

    if (!user) {
      console.log('❌ No hay usuario autenticado');
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    console.log('✅ Usuario autenticado:', user.email);

    return NextResponse.json({
      success: true,
      user
    }, { status: 200 });

  } catch (error) {
    console.error('💥 Error obteniendo usuario actual:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
