// src/app/api/timeslots/[id]/credits-slots/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * 🎁 API: Gestionar plazas reservables con puntos
 * 
 * PATCH /api/timeslots/[id]/credits-slots
 * Body: { slotIndex: 1-4, action: "add" | "remove" }
 * 
 * Permite al instructor marcar/desmarcar plazas específicas como reservables con puntos
 */

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: timeSlotId } = await params;
    const { slotIndex, action, creditsCost, instructorId } = await request.json();

    console.log('🎁 PATCH /api/timeslots/[id]/credits-slots:', {
      timeSlotId,
      slotIndex,
      action,
      creditsCost,
      instructorId
    });

    // Validaciones
    if (!slotIndex || ![1, 2, 3, 4].includes(slotIndex)) {
      return NextResponse.json(
        { error: 'slotIndex debe ser 1, 2, 3 o 4' },
        { status: 400 }
      );
    }

    if (!action || !['add', 'remove'].includes(action)) {
      return NextResponse.json(
        { error: 'action debe ser "add" o "remove"' },
        { status: 400 }
      );
    }

    // Obtener TimeSlot actual
    const timeSlot = await prisma.timeSlot.findUnique({
      where: { id: timeSlotId },
      include: {
        bookings: {
          where: {
            status: { in: ['PENDING', 'CONFIRMED'] }
          }
        }
      }
    });

    if (!timeSlot) {
      return NextResponse.json(
        { error: 'Clase no encontrada' },
        { status: 404 }
      );
    }

    // 🎓 Validar que el instructor que hace el cambio es el instructor de la clase
    if (instructorId && timeSlot.instructorId !== instructorId) {
      console.warn('⛔ Intento de modificar clase de otro instructor:', {
        instructorSolicitante: instructorId,
        instructorClase: timeSlot.instructorId
      });
      return NextResponse.json(
        { error: 'Solo puedes modificar tus propias clases' },
        { status: 403 }
      );
    }

    // Verificar que la plaza esté libre
    const isSlotOccupied = timeSlot.bookings.some(
      (booking: any) => booking.groupSize >= slotIndex
    );

    if (isSlotOccupied && action === 'add') {
      return NextResponse.json(
        { error: 'No puedes marcar una plaza ocupada como "con puntos"' },
        { status: 400 }
      );
    }

    // Parsear creditsSlots existente
    let creditsSlots: number[] = [];
    if (timeSlot.creditsSlots) {
      try {
        creditsSlots = JSON.parse(timeSlot.creditsSlots);
      } catch (e) {
        console.warn('⚠️ Error parseando creditsSlots, usando array vacío');
      }
    }

    // Modificar array según acción
    if (action === 'add') {
      if (!creditsSlots.includes(slotIndex)) {
        creditsSlots.push(slotIndex);
        creditsSlots.sort((a, b) => a - b);
      }
    } else if (action === 'remove') {
      creditsSlots = creditsSlots.filter(idx => idx !== slotIndex);
    }

    // Actualizar TimeSlot
    const updatedTimeSlot = await prisma.timeSlot.update({
      where: { id: timeSlotId },
      data: {
        creditsSlots: JSON.stringify(creditsSlots),
        ...(creditsCost && { creditsCost }),
        updatedAt: new Date()
      }
    });

    console.log('✅ Credits slots actualizados:', creditsSlots);

    return NextResponse.json({
      success: true,
      creditsSlots,
      message: action === 'add' 
        ? `Plaza ${slotIndex} marcada como reservable con puntos`
        : `Plaza ${slotIndex} ya no es reservable con puntos`
    });

  } catch (error) {
    console.error('❌ Error en PATCH /credits-slots:', error);
    return NextResponse.json(
      { 
        error: 'Error al actualizar plazas con puntos',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/timeslots/[id]/credits-slots
 * 
 * Obtiene las plazas marcadas como reservables con puntos
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: timeSlotId } = await params;

    const timeSlot = await prisma.timeSlot.findUnique({
      where: { id: timeSlotId },
      select: {
        id: true,
        creditsSlots: true,
        creditsCost: true
      }
    });

    if (!timeSlot) {
      return NextResponse.json(
        { error: 'Clase no encontrada' },
        { status: 404 }
      );
    }

    let creditsSlots: number[] = [];
    if (timeSlot.creditsSlots) {
      try {
        creditsSlots = JSON.parse(timeSlot.creditsSlots);
      } catch (e) {
        console.warn('⚠️ Error parseando creditsSlots');
      }
    }

    return NextResponse.json({
      creditsSlots,
      creditsCost: timeSlot.creditsCost || 50
    });

  } catch (error) {
    console.error('❌ Error en GET /credits-slots:', error);
    return NextResponse.json(
      { error: 'Error al obtener plazas con puntos' },
      { status: 500 }
    );
  }
}
