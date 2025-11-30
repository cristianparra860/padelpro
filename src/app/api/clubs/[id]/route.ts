// src/app/api/clubs/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    
    // Validar que openingHours sea un array de booleanos
    if (body.openingHours && !Array.isArray(body.openingHours)) {
      return NextResponse.json(
        { error: 'openingHours debe ser un array' },
        { status: 400 }
      );
    }

    // Validar que tenga 19 elementos
    if (body.openingHours && body.openingHours.length !== 19) {
      return NextResponse.json(
        { error: 'openingHours debe tener exactamente 19 elementos (6:00 AM a 12:00 AM)' },
        { status: 400 }
      );
    }

    // Convertir el array a JSON string para guardar en la BD
    const openingHoursJson = body.openingHours 
      ? JSON.stringify(body.openingHours) 
      : null;

    // Actualizar el club en la base de datos
    const updatedClub = await prisma.club.update({
      where: { id },
      data: {
        openingHours: openingHoursJson
      }
    });

    // Parsear el JSON de vuelta a array para la respuesta
    const response = {
      ...updatedClub,
      openingHours: updatedClub.openingHours 
        ? JSON.parse(updatedClub.openingHours) 
        : null
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error actualizando club:', error);
    return NextResponse.json(
      { error: 'Error al actualizar el club' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    const club = await prisma.club.findUnique({
      where: { id }
    });

    if (!club) {
      return NextResponse.json(
        { error: 'Club no encontrado' },
        { status: 404 }
      );
    }

    // Parsear el JSON de openingHours a array
    const response = {
      ...club,
      openingHours: club.openingHours 
        ? JSON.parse(club.openingHours) 
        : null
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error obteniendo club:', error);
    return NextResponse.json(
      { error: 'Error al obtener el club' },
      { status: 500 }
    );
  }
}
