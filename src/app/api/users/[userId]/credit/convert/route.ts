import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;
    const body = await request.json();
    const { euros, pointsPerEuro } = body;

    if (!euros || euros <= 0) {
      return NextResponse.json(
        { error: 'La cantidad debe ser positiva' },
        { status: 400 }
      );
    }

    const eurosInCents = Math.round(euros * 100);
    const pointsToAdd = Math.floor(euros * (pointsPerEuro || 1));

    // Buscar el usuario
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, credits: true, points: true }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Verificar que tenga suficiente saldo
    if ((user.credits || 0) < eurosInCents) {
      return NextResponse.json(
        { error: 'Saldo insuficiente para la conversión' },
        { status: 400 }
      );
    }

    // Actualizar saldo y puntos
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        credits: (user.credits || 0) - eurosInCents,
        points: (user.points || 0) + pointsToAdd
      },
      select: { credits: true, points: true }
    });

    // Convertir céntimos a euros para la respuesta
    const newCreditBalance = (updatedUser.credits || 0) / 100;
    const newLoyaltyPoints = updatedUser.points || 0;

    console.log(`✅ Convertidos ${euros}€ a ${pointsToAdd} puntos para usuario ${userId}`);
    console.log(`   Nuevo saldo: ${newCreditBalance}€, Nuevos puntos: ${newLoyaltyPoints}`);

    return NextResponse.json({
      newCreditBalance,
      newLoyaltyPoints
    });

  } catch (error) {
    console.error('Error al convertir euros a puntos:', error);
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}
