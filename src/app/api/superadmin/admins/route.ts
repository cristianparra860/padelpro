// src/app/api/superadmin/admins/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Obtener todos los admins
export async function GET(request: NextRequest) {
  try {
    const admins = await prisma.admin.findMany({
      include: {
        clubs: {
          select: {
            id: true,
            name: true,
            address: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const formattedAdmins = admins.map(admin => ({
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      phone: admin.phone,
      isActive: admin.isActive,
      clubsCount: admin.clubs.length,
      clubs: admin.clubs,
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt
    }));

    return NextResponse.json({ admins: formattedAdmins });
  } catch (error) {
    console.error('Error fetching admins:', error);
    return NextResponse.json(
      { error: 'Error al obtener los administradores' },
      { status: 500 }
    );
  }
}

// POST - Crear un nuevo admin
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { email, name, phone, role = 'CLUB_ADMIN' } = body;

    // Validaciones
    if (!email || !name) {
      return NextResponse.json(
        { error: 'El email y nombre son obligatorios' },
        { status: 400 }
      );
    }

    // Verificar si ya existe un admin con ese email
    const existingAdmin = await prisma.admin.findUnique({
      where: { email }
    });

    if (existingAdmin) {
      return NextResponse.json(
        { error: 'Ya existe un administrador con ese email' },
        { status: 400 }
      );
    }

    // Crear el admin
    const newAdmin = await prisma.admin.create({
      data: {
        email,
        name,
        phone,
        role,
        isActive: true
      }
    });

    return NextResponse.json({
      message: 'Administrador creado exitosamente',
      admin: newAdmin
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating admin:', error);
    return NextResponse.json(
      { error: 'Error al crear el administrador' },
      { status: 500 }
    );
  }
}
