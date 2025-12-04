// src/app/api/timeslots/credits-slots-batch/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * 🎁 API: Obtener creditsSlots de múltiples slots en batch
 * 
 * POST /api/timeslots/credits-slots-batch
 * Body: { slotIds: string[] }
 * 
 * Optimización para evitar N+1 queries al cargar tarjetas
 */
export async function POST(request: NextRequest) {
  try {
    const { slotIds } = await request.json();

    console.log('🎁 BATCH ENDPOINT CALLED:', { 
      slotIds: slotIds?.slice(0, 3).map((id: string) => id.substring(0, 15) + '...'),
      total: slotIds?.length 
    });

    if (!Array.isArray(slotIds) || slotIds.length === 0) {
      return NextResponse.json(
        { error: 'slotIds debe ser un array con al menos un ID' },
        { status: 400 }
      );
    }

    // Cargar creditsSlots de todos los slots en una sola query
    const timeSlots = await prisma.timeSlot.findMany({
      where: { 
        id: { in: slotIds }
      },
      select: {
        id: true,
        creditsSlots: true
      }
    });

    // Convertir a mapa { slotId: creditsSlots[] }
    const result: Record<string, number[]> = {};
    
    for (const slot of timeSlots) {
      if (slot.creditsSlots) {
        try {
          const parsed = typeof slot.creditsSlots === 'string' 
            ? JSON.parse(slot.creditsSlots) 
            : slot.creditsSlots;
          result[slot.id] = Array.isArray(parsed) ? parsed : [];
        } catch {
          result[slot.id] = [];
        }
      } else {
        result[slot.id] = [];
      }
    }

    // DEBUG: Log específico para slot de Cristian
    const cristianSlot = Object.keys(result).find(k => k.includes('z9y4veby1rd'));
    if (cristianSlot) {
      console.log('   ✨ Slot Cristian Parra:', {
        id: cristianSlot.substring(0, 20) + '...',
        creditsSlots: result[cristianSlot]
      });
    }

    console.log(`   ✅ Returning ${Object.keys(result).length} slots with creditsSlots`);

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ Error en credits-slots-batch:', error);
    return NextResponse.json(
      { error: 'Error al cargar creditsSlots' },
      { status: 500 }
    );
  }
}
