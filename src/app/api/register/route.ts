// src/app/api/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  console.log('🔥 /api/register POST received');
  try {
    const body = await request.json();
    const { name, email, password, genderCategory, level } = body;

    console.log('📝 Registro nuevo usuario:', { name, email, genderCategory, level });

    // Validación básica
    if (!name || !email || !password) {
      console.error('❌ Validación falló: campos requeridos faltantes');
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    // Verificar si el usuario ya existe usando raw SQL
    const existingUsers = await prisma.$queryRaw`
      SELECT id FROM User WHERE email = ${email}
    `;

    console.log('🔍 Usuarios existentes con este email:', existingUsers);

    if (Array.isArray(existingUsers) && existingUsers.length > 0) {
      console.error('❌ Email ya existe');
      return NextResponse.json(
        { error: 'User already exists with this email' },
        { status: 409 }
      );
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('🔐 Contraseña hasheada');

    // Generar un ID único
    const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('🆔 Creando usuario con ID:', userId);

    // Crear el nuevo usuario usando Prisma ORM (más seguro)
    const newUser = await prisma.user.create({
      data: {
        id: userId,
        name,
        email,
        password: hashedPassword,
        clubId: 'padel-estrella-madrid', // Club por defecto
        role: 'PLAYER',
        level: level || 'principiante',
        genderCategory: genderCategory || null,
        credits: 0,
        blockedCredits: 0,
        points: 0,
        preference: 'NORMAL',
        visibility: 'PUBLIC'
      }
    });

    console.log('✅ Usuario creado exitosamente:', {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name
    });

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        level: newUser.level,
        genderCategory: newUser.genderCategory,
        role: newUser.role,
        createdAt: newUser.createdAt
      }
    }, { status: 201 });

  } catch (error) {
    console.error('💥 Error creating user:', error);
    console.error('💥 Error stack:', error instanceof Error ? error.stack : 'No stack');
    console.error('💥 Error message:', error instanceof Error ? error.message : String(error));
    
    // Manejo específico de errores de SQLite
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );  }
}