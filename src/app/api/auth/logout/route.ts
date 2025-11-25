// src/app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  console.log('🚪 /api/auth/logout POST received');

  try {
    // Crear respuesta exitosa
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    }, { status: 200 });

    // Eliminar la cookie del token
    response.cookies.delete('auth_token');

    console.log('✅ Sesión cerrada exitosamente');

    return response;

  } catch (error) {
    console.error('💥 Error en logout:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
