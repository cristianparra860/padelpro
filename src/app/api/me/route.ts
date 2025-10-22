// src/app/api/me/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Por simplicidad, devolver siempre el usuario de prueba
    // En un sistema real, esto vendría de cookies/JWT
    // Usar el ID real del usuario Alex García de la base de datos
    const userId = 'alex-user-id';
    
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      console.error('❌ Usuario no encontrado:', userId);
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Mapear el usuario de la BD al formato esperado
    const mappedUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      level: user.level || 'abierto',
      profilePictureUrl: user.profilePictureUrl,
      credits: user.credits, // Campo de BD
      credit: user.credits,   // Campo esperado por frontend
      blockedCredit: 0,
      loyaltyPoints: 0,
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