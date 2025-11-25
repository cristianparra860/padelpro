import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/test-user-photo
 * Endpoint de prueba para verificar que la foto se devuelve correctamente
 */
export async function GET(request: NextRequest) {
  try {
    console.log('\n🧪 ========== TEST USER PHOTO ==========');
    
    // Buscar usuario Juan Pérez directamente
    const user = await prisma.user.findFirst({
      where: { email: 'jugador1@padelpro.com' }
    });
    
    if (!user) {
      console.log('❌ Usuario no encontrado');
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }
    
    console.log('✅ Usuario encontrado:', user.name);
    console.log('📸 profilePictureUrl en DB:', user.profilePictureUrl ? 'SÍ' : 'NO');
    console.log('📊 Longitud:', user.profilePictureUrl?.length);
    console.log('🎨 Tipo:', user.profilePictureUrl?.substring(0, 30));
    
    // Crear respuesta
    const response = {
      id: user.id,
      name: user.name,
      email: user.email,
      profilePictureUrl: user.profilePictureUrl,
      hasProfilePictureUrl: !!user.profilePictureUrl,
      isValidDataUri: user.profilePictureUrl?.startsWith('data:image') || false,
      photoLength: user.profilePictureUrl?.length || 0,
      photoPreview: user.profilePictureUrl?.substring(0, 100)
    };
    
    console.log('📤 Enviando respuesta con:', {
      hasProfilePictureUrl: response.hasProfilePictureUrl,
      isValidDataUri: response.isValidDataUri,
      photoLength: response.photoLength
    });
    
    console.log('========================================\n');
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ Error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
