import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: NextRequest,
  { params }: { params: { clubId: string } }
) {
  try {
    const { clubId } = params;
    const body = await request.json();

    // Preparar datos para actualizar (solo campos que existen en el modelo Club)
    const updateData: any = {};
    
    if (body.name !== undefined) updateData.name = body.name;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.address !== undefined) updateData.address = body.address;
    if (body.logo !== undefined) updateData.logo = body.logo;
    if (body.website !== undefined) updateData.website = body.website;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.courtRentalPrice !== undefined) updateData.courtRentalPrice = parseFloat(body.courtRentalPrice);
    
    // NOTA: Los horarios (openingTime/closingTime) se guardan en ClubSchedule, no en Club

    // Actualizar el club
    const updatedClub = await prisma.club.update({
      where: { id: clubId },
      data: updateData
    });

    return NextResponse.json(updatedClub);
  } catch (error) {
    console.error('Error updating club:', error);
    return NextResponse.json(
      { error: 'Failed to update club' },
      { status: 500 }
    );
  }
}
