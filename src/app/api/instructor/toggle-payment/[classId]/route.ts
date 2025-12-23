// src/app/api/instructor/toggle-payment/[classId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { classId: string } }
) {
  try {
    const { classId } = params;
    const body = await request.json();
    const { userId, groupSize } = body;

    if (!userId || !groupSize) {
      return NextResponse.json(
        { error: 'Faltan parámetros: userId y groupSize requeridos' },
        { status: 400 }
      );
    }

    // Buscar la reserva específica
    const booking = await prisma.booking.findFirst({
      where: {
        timeSlotId: classId,
        userId,
        groupSize: parseInt(groupSize),
        status: 'CONFIRMED'
      },
      include: {
        user: true,
        timeSlot: true
      }
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Reserva no encontrada' },
        { status: 404 }
      );
    }

    // Calcular precio por persona
    const pricePerPerson = Math.ceil((booking.timeSlot.totalPrice || 25) / booking.groupSize);
    const amountInCentimos = pricePerPerson * 100;

    // Determinar método de pago actual y el nuevo
    const currentMethod = booking.paymentMethod || 'CREDITS';
    const newMethod = currentMethod === 'POINTS' ? 'CREDITS' : 'POINTS';

    if (currentMethod === 'POINTS') {
      // Cambiar de PUNTOS → EUROS
      // 1. Devolver puntos al usuario
      await prisma.user.update({
        where: { id: userId },
        data: {
          loyaltyPoints: {
            increment: pricePerPerson
          }
        }
      });

      // 2. Cobrar en créditos (bloquear créditos)
      await prisma.user.update({
        where: { id: userId },
        data: {
          blockedCredit: {
            increment: amountInCentimos
          }
        }
      });

      // 3. Crear transacciones
      await prisma.transaction.createMany({
        data: [
          {
            userId,
            amount: pricePerPerson,
            type: 'POINTS_EARNED',
            description: `Reembolso de puntos - Cambio a pago con euros por instructor`,
            relatedActivityId: classId,
            clubId: booking.timeSlot.clubId
          },
          {
            userId,
            amount: -amountInCentimos,
            type: 'BOOKING',
            description: `Cargo en euros - Cambio desde puntos por instructor`,
            relatedActivityId: classId,
            clubId: booking.timeSlot.clubId
          }
        ]
      });

      // 4. Actualizar método de pago
      await prisma.booking.update({
        where: { id: booking.id },
        data: { paymentMethod: 'CREDITS' }
      });

      console.log('✅ Cambio PUNTOS→EUROS:', {
        bookingId: booking.id,
        userId,
        puntosDevueltos: pricePerPerson,
        eurosCobrados: amountInCentimos / 100
      });

      return NextResponse.json({
        success: true,
        message: `Cambio exitoso: Puntos → Euros (${pricePerPerson}p → €${pricePerPerson})`,
        previousMethod: 'POINTS',
        newMethod: 'CREDITS'
      });

    } else {
      // Cambiar de EUROS → PUNTOS
      // 1. Liberar créditos bloqueados
      await prisma.user.update({
        where: { id: userId },
        data: {
          blockedCredit: {
            decrement: amountInCentimos
          }
        }
      });

      // 2. Cobrar en puntos
      await prisma.user.update({
        where: { id: userId },
        data: {
          loyaltyPoints: {
            decrement: pricePerPerson
          }
        }
      });

      // 3. Crear transacciones
      await prisma.transaction.createMany({
        data: [
          {
            userId,
            amount: amountInCentimos,
            type: 'REFUND',
            description: `Liberación de euros - Cambio a pago con puntos por instructor`,
            relatedActivityId: classId,
            clubId: booking.timeSlot.clubId
          },
          {
            userId,
            amount: -pricePerPerson,
            type: 'POINTS_SPENT',
            description: `Cargo en puntos - Cambio desde euros por instructor`,
            relatedActivityId: classId,
            clubId: booking.timeSlot.clubId
          }
        ]
      });

      // 4. Actualizar método de pago
      await prisma.booking.update({
        where: { id: booking.id },
        data: { paymentMethod: 'POINTS' }
      });

      console.log('✅ Cambio EUROS→PUNTOS:', {
        bookingId: booking.id,
        userId,
        eurosLiberados: amountInCentimos / 100,
        puntosCobrados: pricePerPerson
      });

      return NextResponse.json({
        success: true,
        message: `Cambio exitoso: Euros → Puntos (€${pricePerPerson} → ${pricePerPerson}p)`,
        previousMethod: 'CREDITS',
        newMethod: 'POINTS'
      });
    }

  } catch (error) {
    console.error('❌ Error cambiando método de pago:', error);
    return NextResponse.json(
      { error: 'Error al cambiar el método de pago' },
      { status: 500 }
    );
  }
}
