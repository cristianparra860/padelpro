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

    // Convertir euros a céntimos
    const amountInCents = Math.round(amount * 100);

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
        credits: (user.credits || 0) + amountInCents
      },
      select: { credits: true }
    });

    // Convertir de nuevo a euros para la respuesta
    const newBalanceInEuros = (updatedUser.credits || 0) / 100;

    console.log(`✅ Añadidos ${amount}€ al usuario ${userId}. Nuevo saldo: ${newBalanceInEuros}€`);

    return NextResponse.json({
      newBalance: newBalanceInEuros
    });

  } catch (error) {
    console.error('Error al añadir crédito:', error);
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}
