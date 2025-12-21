import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Check if user has bookings
    const bookings = await prisma.booking.findMany({
      where: { userId: id }
    });

    if (bookings.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete user with existing bookings' },
        { status: 400 }
      );
    }

    await prisma.user.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { name, email, role, level, genderCategory, phone, profilePictureUrl, credits, loyaltyPoints } = body;

    console.log(`📝 Updating user ${id} with:`, body);

    // ✅ Solo validar email si realmente ha cambiado
    if (email) {
      // Obtener el usuario actual para comparar el email
      const currentUser = await prisma.user.findUnique({
        where: { id },
        select: { email: true }
      });

      // Solo validar si el email es diferente al actual
      if (currentUser && currentUser.email !== email) {
        const existingUser = await prisma.user.findFirst({
          where: {
            email,
            NOT: { id }
          }
        });

        if (existingUser) {
          console.log(`❌ Email ${email} ya está en uso por otro usuario`);
          return NextResponse.json(
            { error: 'El email ya está en uso' },
            { status: 400 }
          );
        }
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(role && { role }),
        ...(level && { level }),
        ...(genderCategory && { genderCategory }),
        ...(phone !== undefined && { phone }),
        ...(profilePictureUrl !== undefined && { profilePictureUrl }),
        ...(credits !== undefined && { credits: Number(credits) }),
        ...(loyaltyPoints !== undefined && { loyaltyPoints: Number(loyaltyPoints) })
      }
    });

    console.log(`✅ User updated successfully:`, user.name);

    return NextResponse.json(user);
  } catch (error: any) {
    console.error('Error updating user:', error);
    
    // Manejar errores específicos de Prisma
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'El email ya está en uso' },
        { status: 400 }
      );
    }
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Error al actualizar usuario' },
      { status: 500 }
    );
  }
}