// src/app/api/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password, genderCategory, level } = body;

    // Validación básica
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    // Verificar si el usuario ya existe usando raw SQL
    const existingUsers = await prisma.$queryRaw`
      SELECT id FROM User WHERE email = ${email}
    `;

    if (Array.isArray(existingUsers) && existingUsers.length > 0) {
      return NextResponse.json(
        { error: 'User already exists with this email' },
        { status: 409 }
      );
    }

    // Generar un ID único
    const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Crear el nuevo usuario usando raw SQL
    await prisma.$executeRaw`
      INSERT INTO User (
        id, name, email, role, level, genderCategory, 
        profilePictureUrl, credit, blockedCredit, loyaltyPoints, 
        blockedLoyaltyPoints, pendingBonusPoints, 
        createdAt, updatedAt, phone, position, clubId, 
        preference, visibility, bio, preferredGameType
      ) VALUES (
        ${userId}, ${name}, ${email}, 'PLAYER', ${level || 'abierto'}, ${genderCategory || 'mixto'},
        NULL, 0, 0.0, 0, 
        0, 0, 
        datetime('now'), datetime('now'), NULL, NULL, NULL,
        'NORMAL', 'PUBLIC', NULL, NULL
      )
    `;

    // Obtener el usuario creado
    const newUserRows = await prisma.$queryRaw`
      SELECT id, name, email, role, level, genderCategory, createdAt
      FROM User WHERE id = ${userId}
    `;

    const newUser = Array.isArray(newUserRows) ? newUserRows[0] : null;

    if (!newUser) {
      throw new Error('Failed to create user');
    }

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
    console.error('Error creating user:', error);
    
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