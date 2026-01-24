import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;

    console.log('📝 Intentando actualizar perfil del usuario:', userId);

    // Usar la función de auth existente
    const currentUser = await getCurrentUser(request);

    if (!currentUser) {
      console.log('❌ No hay usuario autenticado');
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    console.log('✅ Usuario autenticado:', currentUser.id);

    // Verificar que el usuario solo pueda actualizar su propio perfil
    if (currentUser.id !== userId) {
      console.log('❌ Usuario intenta modificar perfil de otro usuario');
      return NextResponse.json({ error: 'No autorizado para modificar este perfil' }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, level, genderCategory, gender } = body;

    console.log('📝 Datos a actualizar:', { name, email, level, genderCategory, gender });

    // Validaciones
    if (name !== undefined && (!name || name.trim().length === 0)) {
      return NextResponse.json({ error: 'El nombre no puede estar vacío' }, { status: 400 });
    }

    if (email !== undefined && (!email || !email.includes('@'))) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
    }

    // Verificar si el email ya existe (si se está cambiando)
    if (email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email,
          NOT: { id: userId }
        }
      });

      if (existingUser) {
        return NextResponse.json({ error: 'El email ya está en uso' }, { status: 400 });
      }
    }

    // Construir objeto de actualización solo con los campos proporcionados
    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (email !== undefined) updateData.email = email.trim();
    if (level !== undefined) updateData.level = level;
    if (gender !== undefined) updateData.gender = gender; // Guardar en el campo correcto
    if (genderCategory !== undefined) updateData.genderCategory = genderCategory; // También actualizar genderCategory

    console.log('💾 Actualizando en base de datos...');

    // Actualizar usuario
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: {
        Club: true
      }
    });

    console.log('✅ Usuario actualizado correctamente:', updatedUser.id);

    return NextResponse.json({
      success: true,
      user: updatedUser
    });

  } catch (error: any) {
    console.error('❌ Error updating user profile:', error);
    console.error('📋 Stack:', error.stack);

    return NextResponse.json({
      error: 'Error al actualizar perfil',
      details: error.message
    }, { status: 500 });
  }
}
