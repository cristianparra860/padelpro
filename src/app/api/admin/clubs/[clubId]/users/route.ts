// src/app/api/admin/clubs/[clubId]/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Obtener todos los usuarios de un club
export async function GET(
  request: NextRequest,
  { params }: { params: { clubId: string } }
) {
  try {
    const { clubId } = params;

    console.log('🔍 Obteniendo usuarios del club:', clubId);

    // Obtener todos los usuarios del club
    const users = await prisma.user.findMany({
      where: {
        clubId: clubId
      },
      orderBy: {
        name: 'asc'
      },
      select: {
        id: true,
        name: true,
        email: true,
        credits: true,
        blockedCredits: true,
        points: true,
        level: true,
        genderCategory: true,
        profilePictureUrl: true,
        createdAt: true
      }
    });

    console.log(`✅ ${users.length} usuarios encontrados`);

    return NextResponse.json(users);
  } catch (error) {
    console.error('❌ Error obteniendo usuarios:', error);
    return NextResponse.json(
      { error: 'Error al obtener usuarios' },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo usuario
export async function POST(
  request: NextRequest,
  { params }: { params: { clubId: string } }
) {
  try {
    const { clubId } = params;
    const body = await request.json();

    const { name, email, level, genderCategory, credits, points } = body;

    // Validaciones
    if (!name || !email) {
      return NextResponse.json(
        { error: 'Nombre y email son requeridos' },
        { status: 400 }
      );
    }

    // Verificar que el email no esté en uso
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'El email ya está en uso' },
        { status: 400 }
      );
    }

    console.log('➕ Creando usuario:', { name, email, clubId });

    // Crear usuario
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        clubId,
        level: level || 'principiante',
        genderCategory: genderCategory || null,
        credits: credits !== undefined ? Number(credits) : 0,
        blockedCredits: 0,
        points: points !== undefined ? Number(points) : 0,
        profilePictureUrl: null
      }
    });

    console.log('✅ Usuario creado:', newUser.id);

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error('❌ Error creando usuario:', error);
    return NextResponse.json(
      { error: 'Error al crear usuario' },
      { status: 500 }
    );
  }
}
