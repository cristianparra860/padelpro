import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;
    const body = await request.json();
    const { amount } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'La cantidad debe ser positiva' },
        { status: 400 }
      );
    }

    // Los créditos se almacenan en euros directamente
    const amountInEuros = Number(amount);

    // Buscar el usuario
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, credits: true }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Actualizar el saldo
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        credits: (user.credits || 0) + amountInEuros
      },
      select: { credits: true }
    });

    const newBalance = updatedUser.credits || 0;

    console.log(`✅ Añadidos ${amount}€ al usuario ${userId}. Nuevo saldo: ${newBalance}€`);

    return NextResponse.json({
      newBalance
    });

  } catch (error) {
    console.error('Error al añadir crédito:', error);
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}
