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
    
    // Validar openingHours (puede ser objeto con días de la semana o array legacy)
    let openingHoursJson = null;
    
    if (body.openingHours) {
      // Nuevo formato: objeto con días de la semana
      if (typeof body.openingHours === 'object' && !Array.isArray(body.openingHours)) {
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const validFormat = days.every(day => 
          body.openingHours[day] && 
          Array.isArray(body.openingHours[day]) && 
          body.openingHours[day].length === 19
        );
        
        if (!validFormat) {
          return NextResponse.json(
            { error: 'openingHours debe tener 7 días con 19 horas cada uno' },
            { status: 400 }
          );
        }
        
        openingHoursJson = JSON.stringify(body.openingHours);
      }
      // Formato legacy: array de booleanos
      else if (Array.isArray(body.openingHours)) {
        if (body.openingHours.length !== 19) {
          return NextResponse.json(
            { error: 'openingHours array debe tener 19 elementos' },
            { status: 400 }
          );
        }
        openingHoursJson = JSON.stringify(body.openingHours);
      }
      else {
        return NextResponse.json(
          { error: 'openingHours debe ser un objeto con días de la semana o un array' },
          { status: 400 }
        );
      }
    }

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
