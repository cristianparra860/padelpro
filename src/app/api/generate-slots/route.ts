import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Genera TimeSlots automáticamente basado en la disponibilidad de instructores
 * Cada slot es de 30 minutos y se genera para los próximos 7 días
 */

interface SlotGenerationConfig {
  slotDurationMinutes: number;
  daysToGenerate: number;
  maxPlayersPerSlot: number;
  defaultPricePerSlot: number;
}

interface GeneratedSlot {
  instructorId: string;
  courtId?: string;
  start: Date;
  end: Date;
  maxPlayers: number;
  totalPrice: number;
  level: string;
  category: string;
}

const DEFAULT_CONFIG: SlotGenerationConfig = {
  slotDurationMinutes: 30,
  daysToGenerate: 7,
  maxPlayersPerSlot: 4,
  defaultPricePerSlot: 25.0
};

/**
 * Convierte string de tiempo "HH:MM" a minutos desde medianoche
 */
function timeStringToMinutes(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Convierte minutos desde medianoche a Date para un día específico
 */
function minutesToDateTime(minutes: number, date: Date): Date {
  const result = new Date(date);
  result.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return result;
}

/**
 * Genera slots de 30 minutos dentro de un rango de tiempo
 */
function generateSlotsForTimeRange(
  instructorId: string, 
  date: Date, 
  startMinutes: number, 
  endMinutes: number,
  config: SlotGenerationConfig
): GeneratedSlot[] {
  const slots: GeneratedSlot[] = [];
  
  for (let currentMinutes = startMinutes; currentMinutes < endMinutes; currentMinutes += config.slotDurationMinutes) {
    const slotStart = minutesToDateTime(currentMinutes, date);
    const slotEnd = minutesToDateTime(currentMinutes + config.slotDurationMinutes, date);
    
    slots.push({
      instructorId,
      start: slotStart,
      end: slotEnd,
      maxPlayers: config.maxPlayersPerSlot,
      totalPrice: config.defaultPricePerSlot,
      level: 'abierto',
      category: 'ABIERTO'
    });
  }
  
  return slots;
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clubId = searchParams.get('clubId') || 'club-1';
    const config = { ...DEFAULT_CONFIG };
    
    console.log('🚀 Iniciando generación automática de slots para club:', clubId);

    // 1. Obtener todos los instructores disponibles del club
    const instructors = await prisma.instructor.findMany({
      where: { 
        clubId
      }
    });

    console.log('👨‍🏫 Instructores encontrados:', instructors.length);

    if (instructors.length === 0) {
      return NextResponse.json({
        message: 'No hay instructores disponibles para generar slots',
        slotsGenerated: 0
      });
    }

    // 2. Obtener pistas disponibles (usando raw query para evitar problemas con campos null)
    const courts = await prisma.$queryRaw`SELECT id, clubId, number FROM Court WHERE clubId = ${clubId}` as Array<{id: string, clubId: string, number: number}>;

    if (courts.length === 0) {
      return NextResponse.json(
        { error: 'No hay pistas disponibles en el club' },
        { status: 400 }
      );
    }

    console.log('🎾 Pistas disponibles:', courts.length);

    // 3. Generar slots para los próximos días con horarios fijos temporalmente
    const generatedSlots: GeneratedSlot[] = [];
    const today = new Date();
    
    // Horarios fijos temporales (mañana y tarde)
    const fixedSchedules = [
      { startTime: "09:00", endTime: "12:00" }, // Mañana
      { startTime: "16:00", endTime: "20:00" }  // Tarde
    ];

    for (let dayOffset = 0; dayOffset < config.daysToGenerate; dayOffset++) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + dayOffset);
      targetDate.setHours(0, 0, 0, 0); // Empezar desde medianoche
      
      console.log(`📅 Procesando día ${dayOffset + 1}: ${targetDate.toDateString()}`);
      
      // Para cada instructor, generar slots con horarios fijos
      for (const instructor of instructors) {
        console.log(`   👨‍🏫 Instructor ID: ${instructor.id}`);
        
        // Para cada franja horaria fija
        for (const schedule of fixedSchedules) {
          const startMinutes = timeStringToMinutes(schedule.startTime);
          const endMinutes = timeStringToMinutes(schedule.endTime);
          
          // Generar slots de 30 minutos en esta franja
          const slotsForRange = generateSlotsForTimeRange(
            instructor.id,
            targetDate,
            startMinutes,
            endMinutes,
            config
          );
          
          generatedSlots.push(...slotsForRange);
          console.log(`      🕐 ${schedule.startTime}-${schedule.endTime}: ${slotsForRange.length} slots`);
        }
      }
    }

    console.log('📊 Total slots generados:', generatedSlots.length);

    // 4. Crear los slots en la base de datos
    let createdCount = 0;
    let skippedCount = 0;
    
    for (const slot of generatedSlots) {
      // Verificar si ya existe un slot para este instructor en este horario
      const existingSlot = await prisma.$queryRaw`
        SELECT id FROM TimeSlot 
        WHERE instructorId = ${slot.instructorId} 
        AND start = ${slot.start.toISOString()} 
        AND end = ${slot.end.toISOString()}
        LIMIT 1
      `;

      if ((existingSlot as any[]).length > 0) {
        skippedCount++;
        continue;
      }

      // Asignar pista de forma rotativa
      const courtIndex = createdCount % courts.length;
      const assignedCourt = courts[courtIndex];

      // Crear el slot usando raw SQL
      try {
        await prisma.$executeRaw`
          INSERT INTO TimeSlot (
            id, clubId, courtId, instructorId, start, end, 
            maxPlayers, totalPrice, level, category, createdAt, updatedAt
          ) VALUES (
            ${`slot-${Date.now()}-${createdCount}`},
            ${clubId},
            ${assignedCourt.id}, 
            ${slot.instructorId},
            ${slot.start.toISOString()},
            ${slot.end.toISOString()},
            ${slot.maxPlayers},
            ${slot.totalPrice},
            ${slot.level},
            ${slot.category},
            datetime('now'),
            datetime('now')
          )
        `;
        createdCount++;
      } catch (error) {
        console.error('Error creando slot:', error);
      }
    }

    console.log('✅ Generación completada:', {
      slotsGenerados: generatedSlots.length,
      slotsCreados: createdCount,
      slotsOmitidos: skippedCount
    });

    return NextResponse.json({
      message: 'Slots generados automáticamente',
      slotsGenerated: generatedSlots.length,
      slotsCreated: createdCount,
      slotsSkipped: skippedCount,
      config
    });

  } catch (error) {
    console.error('❌ Error generando slots automáticos:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Generador automático de slots',
    description: 'Usa POST para generar slots basados en disponibilidad de instructores',
    config: DEFAULT_CONFIG
  });
}