// src/app/api/me/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Por simplicidad, devolver siempre el usuario de prueba
    // En un sistema real, esto vendría de cookies/JWT
    // Buscar por email en lugar de ID antiguo
    const userEmail = 'alex@example.com';
    
    console.log('🔍 /api/me - Buscando usuario:', userEmail);
    
    const user = await prisma.user.findUnique({
      where: { email: userEmail }
    });

    if (!user) {
      console.error('❌ Usuario no encontrado:', userEmail);
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    console.log('✅ /api/me - Usuario encontrado:', {
      id: user.id,
      email: user.email,
      credits: user.credits,
      blockedCredits: user.blockedCredits,
      points: user.points
    });

    // Mapear el usuario de la BD al formato esperado
    const mappedUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      level: user.level || 'abierto',
      genderCategory: user.genderCategory,
      profilePictureUrl: user.profilePictureUrl,
      credits: user.credits, // Campo de BD (en centavos)
      credit: user.credits,   // Campo esperado por frontend
      blockedCredit: user.blockedCredits || 0,
      blockedCredits: user.blockedCredits || 0,
      loyaltyPoints: user.points || 0,
      points: user.points || 0,
      clubId: user.clubId,
      role: user.role
    };

    return NextResponse.json({ 
      user: mappedUser,
      success: true 
    });

  } catch (error) {
    console.error('Error en /api/me:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 });  }
}