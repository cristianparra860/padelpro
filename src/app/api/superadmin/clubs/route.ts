// src/app/api/superadmin/clubs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Obtener todos los clubs con información detallada
export async function GET(request: NextRequest) {
  try {
    const clubs = await prisma.club.findMany({
      include: {
        admin: true,
        courts: true,
        users: {
          select: {
            id: true,
            role: true
          }
        },
        instructors: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Formatear respuesta con estadísticas
    const formattedClubs = clubs.map(club => ({
      id: club.id,
      name: club.name,
      address: club.address,
      phone: club.phone,
      email: club.email,
      website: club.website,
      logo: club.logo,
      description: club.description,
      courtRentalPrice: club.courtRentalPrice,
      openingHours: club.openingHours ? JSON.parse(club.openingHours) : null,
      adminId: club.adminId,
      adminName: club.admin?.name || 'Sin asignar',
      adminEmail: club.admin?.email || '',
      courtsCount: club.courts.length,
      usersCount: club.users.length,
      instructorsCount: club.instructors.length,
      playersCount: club.users.filter(u => u.role === 'PLAYER').length,
      clubAdminsCount: club.users.filter(u => u.role === 'CLUB_ADMIN').length,
      createdAt: club.createdAt,
      updatedAt: club.updatedAt
    }));

    return NextResponse.json({ clubs: formattedClubs });
  } catch (error) {
    console.error('Error fetching clubs:', error);
    return NextResponse.json(
      { error: 'Error al obtener los clubs' },
      { status: 500 }
    );
  }
}

// POST - Crear un nuevo club
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      name,
      address,
      phone,
      email,
      website,
      description,
      courtRentalPrice = 10.0,
      adminEmail,
      courtsCount = 4 // Número de pistas a crear por defecto
    } = body;

    // Validaciones
    if (!name || !address) {
      return NextResponse.json(
        { error: 'El nombre y dirección son obligatorios' },
        { status: 400 }
      );
    }

    // Verificar si ya existe un club con el mismo nombre
    const existingClub = await prisma.club.findFirst({
      where: { name }
    });

    if (existingClub) {
      return NextResponse.json(
        { error: 'Ya existe un club con ese nombre' },
        { status: 400 }
      );
    }

    // Buscar o crear admin si se proporciona email
    let adminId = null;
    if (adminEmail) {
      let admin = await prisma.admin.findUnique({
        where: { email: adminEmail }
      });

      if (!admin) {
        // Crear nuevo admin
        admin = await prisma.admin.create({
          data: {
            email: adminEmail,
            name: adminEmail.split('@')[0], // Usar parte del email como nombre temporal
            role: 'CLUB_ADMIN'
          }
        });
      }
      
      adminId = admin.id;
    }

    // Crear el club
    const newClub = await prisma.club.create({
      data: {
        name,
        address,
        phone,
        email,
        website,
        description,
        courtRentalPrice,
        adminId
      }
    });

    // Crear pistas automáticamente
    if (courtsCount > 0) {
      const courtsData = Array.from({ length: courtsCount }, (_, i) => ({
        clubId: newClub.id,
        number: i + 1,
        name: `Pista ${i + 1}`,
        capacity: 4,
        isActive: true
      }));

      await prisma.court.createMany({
        data: courtsData
      });
    }

    // Obtener el club creado con todas las relaciones
    const createdClub = await prisma.club.findUnique({
      where: { id: newClub.id },
      include: {
        admin: true,
        courts: true
      }
    });

    return NextResponse.json({
      message: 'Club creado exitosamente',
      club: createdClub
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating club:', error);
    return NextResponse.json(
      { error: 'Error al crear el club' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar un club
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clubId = searchParams.get('clubId');

    if (!clubId) {
      return NextResponse.json(
        { error: 'clubId es requerido' },
        { status: 400 }
      );
    }

    // Verificar si el club existe
    const club = await prisma.club.findUnique({
      where: { id: clubId }
    });

    if (!club) {
      return NextResponse.json(
        { error: 'Club no encontrado' },
        { status: 404 }
      );
    }

    // Eliminar el club (las relaciones se eliminan en cascada según el schema)
    await prisma.club.delete({
      where: { id: clubId }
    });

    return NextResponse.json({
      message: 'Club eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error deleting club:', error);
    return NextResponse.json(
      { error: 'Error al eliminar el club' },
      { status: 500 }
    );
  }
}
