// src/app/api/admin/club-info/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'padelpro-secret-key-change-in-production';

// Verificar permisos de admin
async function verifyAdmin(request: NextRequest) {
  try {
    // Intentar obtener el token de múltiples fuentes
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.replace('Bearer ', '');
    const tokenFromCookie = request.cookies.get('auth_token')?.value;

    const token = tokenFromHeader || tokenFromCookie;

    console.log('🔐 Verificando autenticación:', {
      hasAuthHeader: !!authHeader,
      hasTokenFromHeader: !!tokenFromHeader,
      hasTokenFromCookie: !!tokenFromCookie,
      usingToken: token ? 'encontrado' : 'no encontrado'
    });

    if (!token) {
      console.error('❌ No se encontró token');
      return { error: 'No autorizado', status: 401 };
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    console.log('✅ Token válido para userId:', decoded.userId);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { role: true, clubId: true }
    });

    if (!user) {
      console.error('❌ Usuario no encontrado:', decoded.userId);
      return { error: 'Usuario no encontrado', status: 404 };
    }

    if (user.role !== 'CLUB_ADMIN' && user.role !== 'SUPER_ADMIN') {
      console.error('❌ Rol insuficiente:', user.role);
      return { error: 'No autorizado', status: 403 };
    }

    console.log('✅ Usuario autorizado:', user.role);
    return { user, clubId: user.clubId };
  } catch (error) {
    console.error('❌ Error en verificación:', error);
    if (error instanceof jwt.JsonWebTokenError) {
      return { error: 'Token inválido o expirado', status: 401 };
    }
    return { error: 'Error de autenticación', status: 401 };
  }
}

// GET - Obtener información del club
export async function GET(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    // Obtener clubId del usuario autenticado
    const clubId = auth.clubId;

    if (!clubId) {
      console.error('❌ Usuario no tiene clubId asignado');
      return NextResponse.json({ error: 'Usuario no tiene club asignado' }, { status: 400 });
    }

    console.log('📋 Obteniendo datos del club:', clubId);

    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        email: true,
        website: true,
        logo: true,
        heroImage: true,
        description: true,
        courtRentalPrice: true,
        openingHours: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!club) {
      console.error('❌ Club no encontrado:', clubId);
      return NextResponse.json({ error: 'Club no encontrado' }, { status: 404 });
    }

    console.log('✅ Club encontrado:', club.id, club.name);

    // Serializar correctamente las fechas
    return NextResponse.json({
      ...club,
      createdAt: club.createdAt.toISOString(),
      updatedAt: club.updatedAt.toISOString(),
      logoUrl: club.logo
    });
  } catch (error: any) {
    console.error('❌ Error al obtener club:', error);
    console.error('❌ Error message:', error?.message);
    console.error('❌ Error stack:', error?.stack);
    return NextResponse.json({
      error: 'Error al obtener información del club',
      details: error?.message
    }, { status: 500 });
  }
}

// PUT - Actualizar información del club (solo datos de página informativa)
export async function PUT(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { address, phone, email, website, logo, heroImage, description } = body;

    // Obtener clubId del usuario autenticado
    const clubId = auth.clubId;

    if (!clubId) {
      console.error('❌ Usuario no tiene clubId asignado');
      return NextResponse.json({ error: 'Usuario no tiene club asignado' }, { status: 400 });
    }

    console.log('📝 Actualizando club:', clubId);
    console.log('📄 Datos recibidos:', {
      address,
      phone,
      email,
      website,
      hasLogo: !!logo,
      logoLength: logo?.length,
      hasHeroImage: !!heroImage,
      heroImageLength: heroImage?.length,
      description: description?.substring(0, 30)
    });

    // Preparar datos para actualizar (convertir strings vacíos a null)
    const updateData: any = {};
    if (address !== undefined) updateData.address = address === '' ? null : address;
    if (phone !== undefined) updateData.phone = phone === '' ? null : phone;
    if (email !== undefined) updateData.email = email === '' ? null : email;
    if (website !== undefined) updateData.website = website === '' ? null : website;
    if (logo !== undefined) updateData.logo = logo;
    if (heroImage !== undefined) updateData.heroImage = heroImage;
    if (description !== undefined) updateData.description = description === '' ? null : description;

    console.log('📄 Datos preparados:', {
      ...updateData,
      logo: updateData.logo ? `(${updateData.logo.length} chars)` : 'null',
      heroImage: updateData.heroImage ? `(${updateData.heroImage.length} chars)` : 'null'
    });

    const updatedClub = await prisma.club.update({
      where: { id: clubId },
      data: updateData
    });

    console.log('✅ Club actualizado correctamente');

    return NextResponse.json({
      success: true,
      club: {
        ...updatedClub,
        logoUrl: updatedClub.logo
      }
    });
  } catch (error: any) {
    console.error('❌ Error al actualizar club:', error);
    console.error('❌ Error message:', error?.message);
    console.error('❌ Error stack:', error?.stack);
    console.error('❌ Error code:', error?.code);
    return NextResponse.json({
      error: 'Error al actualizar información del club',
      details: error?.message
    }, { status: 500 });
  }
}
