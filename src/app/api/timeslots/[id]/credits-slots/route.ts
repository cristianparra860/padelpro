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
        { error: 'slotIndex debe ser 1, 2, 3 o 4 (representa el groupSize)' },
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

    // ✅ VALIDACIÓN: Solo se puede marcar como "con puntos" la ÚLTIMA plaza que completa la clase
    // slotIndex representa el groupSize (1, 2, 3 o 4 jugadores)
    
    // Contar cuántas reservas activas hay para este groupSize
    const activeBookingsForGroupSize = timeSlot.bookings.filter(
      (booking: any) => booking.groupSize === slotIndex && booking.status !== 'CANCELLED'
    ).length;
    
    // 🚫 Si ya hay reservas para este groupSize, no permitir marcar como "con puntos"
    if (activeBookingsForGroupSize > 0 && action === 'add') {
      return NextResponse.json(
        { 
          error: `Ya existe una reserva para ${slotIndex} jugador(es). No puedes marcar esta modalidad como "con puntos" mientras esté ocupada.` 
        },
        { status: 400 }
      );
    }
    
    // 🎯 VALIDACIÓN CRÍTICA: Solo permitir marcar la ÚLTIMA plaza que completa el grupo
    // Ejemplo: Si es clase de 3 jugadores, solo se puede marcar cuando hay 2 reservas (falta 1)
    if (action === 'add') {
      // Para groupSize 1: Siempre se puede (es la única plaza)
      // Para groupSize 2-4: Solo si falta exactamente 1 plaza para completar
      if (slotIndex > 1) {
        // Calcular cuántas plazas faltan para completar este grupo
        const requiredBookings = slotIndex; // Si slotIndex=3, necesita 3 reservas
        const missingSlots = requiredBookings - activeBookingsForGroupSize;
        
        if (missingSlots !== 1) {
          return NextResponse.json(
            { 
              error: `Solo puedes marcar como "con puntos" la ÚLTIMA plaza que completa el grupo.\n\nActualmente hay ${activeBookingsForGroupSize}/${requiredBookings} reservas.\n\n${missingSlots > 1 ? `Faltan ${missingSlots} plazas, espera a que solo falte 1.` : 'El grupo ya está completo.'}`,
              current: activeBookingsForGroupSize,
              required: requiredBookings,
              missing: missingSlots
            },
            { status: 400 }
          );
        }
        
        console.log(`✅ Validación OK: Falta exactamente 1 plaza de ${slotIndex} para completar grupo (${activeBookingsForGroupSize}/${requiredBookings})`);
      }
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
