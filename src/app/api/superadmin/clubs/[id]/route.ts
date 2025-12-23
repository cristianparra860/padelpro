import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PUT /api/superadmin/clubs/[id] - Actualizar club
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const {
      name,
      address,
      phone,
      email,
      website,
      description,
      courtRentalPrice,
      openingHours
    } = body;

    // Verificar que el club existe
    const existingClub = await prisma.club.findUnique({
      where: { id }
    });

    if (!existingClub) {
      return NextResponse.json(
        { error: 'Club no encontrado' },
        { status: 404 }
      );
    }

    // Actualizar el club
    const club = await prisma.club.update({
      where: { id },
      data: {
        name: name?.trim() || existingClub.name,
        address: address?.trim() || null,
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        website: website?.trim() || null,
        description: description?.trim() || null,
        courtRentalPrice: courtRentalPrice ?? existingClub.courtRentalPrice,
        openingHours: openingHours?.trim() || null,
      }
    });

    console.log('✅ Club actualizado:', club.id);

    return NextResponse.json(club);

  } catch (error: any) {
    console.error('❌ Error updating club:', error);
    return NextResponse.json(
      { error: 'Error al actualizar el club', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/superadmin/clubs/[id] - Eliminar club
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verificar que el club existe
    const existingClub = await prisma.club.findUnique({
      where: { id }
    });

    if (!existingClub) {
      return NextResponse.json(
        { error: 'Club no encontrado' },
        { status: 404 }
      );
    }

    // TODO: Verificar dependencias (users, courts, instructors, etc.)
    // Por ahora eliminamos directamente

    await prisma.club.delete({
      where: { id }
    });

    console.log('🗑️ Club eliminado:', id);

    return NextResponse.json({ success: true, message: 'Club eliminado exitosamente' });

  } catch (error: any) {
    console.error('❌ Error deleting club:', error);
    
    // Si hay un error de constraint, es porque tiene datos relacionados
    if (error.code === 'P2003' || error.code === 'P2014') {
      return NextResponse.json(
        { error: 'No se puede eliminar el club porque tiene datos relacionados (usuarios, pistas, etc.)' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Error al eliminar el club', details: error.message },
      { status: 500 }
    );
  }
}
