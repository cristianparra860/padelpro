// src/app/api/court-pricing/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Obtiene el precio por hora de una pista en una fecha/hora específica
 * GET /api/court-pricing?clubId=xxx&date=2024-01-15T09:00:00.000Z
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clubId = searchParams.get('clubId');
    const dateStr = searchParams.get('date');

    if (!clubId || !dateStr) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos: clubId y date' },
        { status: 400 }
      );
    }

    const targetDate = new Date(dateStr);
    const dayOfWeek = targetDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const timeStr = `${String(targetDate.getHours()).padStart(2, '0')}:${String(targetDate.getMinutes()).padStart(2, '0')}`;

    // Buscar precio específico para este día y hora
    const priceSlot = await prisma.courtPriceSlot.findFirst({
      where: {
        clubId,
        dayOfWeek,
        isActive: true,
      },
      orderBy: {
        priority: 'asc', // Menor prioridad = más específico
      },
    });

    // Verificar si la hora está dentro del rango del slot
    let pricePerHour = null;

    if (priceSlot) {
      const [startHour, startMin] = priceSlot.startTime.split(':').map(Number);
      const [endHour, endMin] = priceSlot.endTime.split(':').map(Number);
      const [targetHour, targetMin] = timeStr.split(':').map(Number);

      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      const targetMinutes = targetHour * 60 + targetMin;

      if (targetMinutes >= startMinutes && targetMinutes < endMinutes) {
        pricePerHour = priceSlot.price;
      }
    }

    // Si no hay precio específico, usar precio base del club
    if (pricePerHour === null) {
      const club = await prisma.club.findUnique({
        where: { id: clubId },
        select: { courtRentalPrice: true },
      });

      pricePerHour = club?.courtRentalPrice || 10; // Default 10€ si no existe
    }

    return NextResponse.json({
      pricePerHour,
      dayOfWeek,
      time: timeStr,
      date: targetDate.toISOString(),
    });
  } catch (error) {
    console.error('Error getting court price:', error);
    return NextResponse.json(
      { error: 'Error al obtener precio de pista', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
