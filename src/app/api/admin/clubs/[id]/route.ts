import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, address, phone, email, logo, description, openingTime, closingTime, courtRentalPrice } = body;

    console.log('🔍 Updating club:', params.id, body);

    const club = await prisma.club.update({
      where: { id: params.id },
      data: {
        name,
        address,
        phone,
        email,
        logo,
        description,
        courtRentalPrice: courtRentalPrice !== undefined ? parseFloat(courtRentalPrice) : undefined,
        // Note: openingTime and closingTime would need to be stored in a separate table or as JSON
        // For now, we'll skip them as they're not in the current schema
      }
    });

    // Si se actualizó el precio de alquiler de pista, actualizar todos los TimeSlots del club
    if (courtRentalPrice !== undefined) {
      const newCourtPrice = parseFloat(courtRentalPrice);
      console.log(`💰 Actualizando precio de pista a €${newCourtPrice} para todos los TimeSlots del club`);
      
      // Usar raw SQL para actualizar masivamente (mucho más rápido)
      const result = await prisma.$executeRaw`
        UPDATE TimeSlot 
        SET 
          courtRentalPrice = ${newCourtPrice},
          totalPrice = COALESCE(instructorPrice, 15) + ${newCourtPrice}
        WHERE clubId = ${params.id}
      `;

      console.log(`✅ Actualizados ${result} TimeSlots con nuevo precio de pista`);
    }

    console.log('✅ Club updated successfully');
    return NextResponse.json(club);
  } catch (error) {
    console.error('❌ Error updating club:', error);
    return NextResponse.json(
      { error: 'Failed to update club', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const club = await prisma.club.findUnique({
      where: { id: params.id }
    });

    if (!club) {
      return NextResponse.json(
        { error: 'Club not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(club);
  } catch (error) {
    console.error('Error fetching club:', error);
    return NextResponse.json(
      { error: 'Failed to fetch club' },
      { status: 500 }
    );
  }
}
