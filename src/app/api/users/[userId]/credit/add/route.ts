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

    // Los créditos se almacenan en céntimos (1€ = 100 céntimos)
    const amountInCents = Math.round(Number(amount) * 100);

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

    // Actualizar el saldo (sumar céntimos)
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        credits: (user.credits || 0) + amountInCents
      },
      select: { credits: true }
    });

    // Convertir céntimos a euros para la respuesta
    const newBalanceInEuros = (updatedUser.credits || 0) / 100;

    console.log(`✅ Añadidos ${amount}€ (${amountInCents} céntimos) al usuario ${userId}. Nuevo saldo: ${newBalanceInEuros}€`);

    // Registrar transacción
    try {
      await prisma.transaction.create({
        data: {
          userId,
          type: 'credit',
          action: 'add',
          amount: amountInCents,
          balance: updatedUser.credits || 0,
          concept: 'Recarga de saldo',
          metadata: JSON.stringify({ method: 'manual', amountInEuros: amount })
        }
      });
    } catch (txError) {
      console.error('⚠️ Error al registrar transacción:', txError);
    }

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
