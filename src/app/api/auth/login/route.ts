// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
// import { prisma } from '@/lib/prisma';
import { PrismaClient } from '@prisma/client'; // Use local instance for stability
import * as bcrypt from 'bcryptjs';
import { generateToken } from '@/lib/auth';

const prisma = new PrismaClient(); // Local instance

export async function POST(request: NextRequest) {
  console.log('🔐 /api/auth/login POST received');

  try {
    const body = await request.json();
    const { email, password } = body;

    console.log('📧 Login attempt for:', email);

    // Validación básica
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Buscar usuario en la base de datos
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        Club: true
      }
    });

    if (!user) {
      console.error('❌ Usuario no encontrado:', email);
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Si el usuario no tiene contraseña (migrado desde mock), rechazar
    if (!user.password) {
      console.error('❌ Usuario sin contraseña configurada');
      return NextResponse.json(
        { error: 'Password not configured. Please contact administrator.' },
        { status: 401 }
      );
    }

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      console.error('❌ Contraseña incorrecta para:', email);
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    console.log('✅ Login exitoso:', user.email);

    // Generar JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      clubId: user.clubId || ''
    });

    console.log('🎫 Token JWT generado');

    // Retornar datos del usuario (sin password)
    const { password: _, ...userWithoutPassword } = user;

    // Crear respuesta con token en cookie httpOnly
    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      user: userWithoutPassword,
      token // También enviar en el body para apps móviles/SPAs
    }, { status: 200 });

    // Configurar cookie httpOnly con el token (más seguro que localStorage)
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 días
      path: '/'
    });

    return response;

  } catch (error: any) {
    console.error('💥 Error en login:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        debug_message: error.message,
        debug_stack: error.stack
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
