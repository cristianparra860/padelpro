import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getCourtPriceForTime } from '@/lib/courtPricing';

const prisma = new PrismaClient();

/**
 * 🤖 API ENDPOINT: Generador automático de tarjetas
 * 
 * GET /api/cron/generate-cards?daysRange=30
 * GET /api/cron/generate-cards?targetDay=30 (legacy)
 * 
 * Genera propuestas de clases para los próximos N días.
 * - daysRange: Genera para todos los días en el rango [0, N] (recomendado)
 * - targetDay: Genera solo para un día específico (comportamiento legacy)
 * 
 * Por defecto genera para los próximos 30 días.
 * 
 * Verifica disponibilidad de pistas e instructores.
 * Puede ser llamado por:
 * - Vercel Cron Jobs (cada día a las 00:00 UTC)
 * - GitHub Actions
 * - Servicio externo (cron-job.org, etc.)
 * - Manualmente para desarrollo local
 */

// Verificar disponibilidad de pistas e instructores
async function checkAvailability(date: string, startTime: string, endTime: string, specificInstructorId?: string) {
  const startDateTime = new Date(`${date}T${startTime}:00.000Z`);
  const endDateTime = new Date(`${date}T${endTime}:00.000Z`);
  
  // Contar total de pistas activas
  const totalCourts = await prisma.$queryRaw<Array<{count: number}>>`
    SELECT COUNT(*) as count FROM Court WHERE isActive = 1
  `;

  const totalCourtsCount = Number(totalCourts[0]?.count || 0);

  // Si no hay pistas, no hay disponibilidad
  if (totalCourtsCount === 0) {
    return {
      hasAvailability: false,
      availableCourts: 0,
      reason: 'No active courts'
    };
  }
  
  // Verificar pistas ocupadas
  const occupiedCourts = await prisma.$queryRaw<Array<{courtId: string}>>`
    SELECT DISTINCT courtId 
    FROM CourtSchedule
    WHERE date = ${date}
    AND isOccupied = 1
    AND (
      (startTime <= ${startDateTime.toISOString()} AND endTime > ${startDateTime.toISOString()})
      OR (startTime < ${endDateTime.toISOString()} AND endTime >= ${endDateTime.toISOString()})
      OR (startTime >= ${startDateTime.toISOString()} AND endTime <= ${endDateTime.toISOString()})
    )
  `;

  const availableCourts = totalCourtsCount - occupiedCourts.length;

  if (availableCourts === 0) {
    return {
      hasAvailability: false,
      availableCourts: 0,
      reason: 'All courts occupied'
    };
  }

  // Si se especifica un instructor, verificar solo ese instructor
  if (specificInstructorId) {
    const instructorOccupied = await prisma.$queryRaw<Array<{instructorId: string}>>`
      SELECT instructorId 
      FROM InstructorSchedule
      WHERE date = ${date}
      AND instructorId = ${specificInstructorId}
      AND isOccupied = 1
      AND (
        (startTime <= ${startDateTime.toISOString()} AND endTime > ${startDateTime.toISOString()})
        OR (startTime < ${endDateTime.toISOString()} AND endTime >= ${endDateTime.toISOString()})
        OR (startTime >= ${startDateTime.toISOString()} AND endTime <= ${endDateTime.toISOString()})
      )
    `;

    if (instructorOccupied.length > 0) {
      return {
        hasAvailability: false,
        availableCourts,
        reason: 'Instructor occupied'
      };
    }
  }

  return {
    hasAvailability: true,
    availableCourts,
    reason: 'Available'
  };
}

// Generar tarjetas para un día
async function generateCardsForDay(date: string, clubId: string) {
  let createdCount = 0;
  let skippedCount = 0;

  // 🕐 PASO 1: Obtener horarios de apertura del club y día de la semana
  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: { openingHours: true, name: true }
  });

  // Determinar el día de la semana de la fecha a generar
  const targetDate = new Date(date);
  const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][targetDate.getUTCDay()];
  console.log(`📅 Generando para: ${date} (${dayOfWeek})`);

  // Parsear los horarios de apertura
  let openingHoursArray: boolean[] = [];
  if (club?.openingHours) {
    try {
      const parsedHours = JSON.parse(club.openingHours);
      
      // Nuevo formato: objeto con días de la semana
      if (typeof parsedHours === 'object' && !Array.isArray(parsedHours)) {
        openingHoursArray = parsedHours[dayOfWeek] || [];
        console.log(`🕐 Horarios de ${dayOfWeek} para ${club.name}: ${openingHoursArray.filter(Boolean).length}/19 horas abiertas`);
      }
      // Formato legacy: array único para todos los días
      else if (Array.isArray(parsedHours)) {
        openingHoursArray = parsedHours;
        console.log(`🕐 Horarios (legacy) para ${club.name}: ${openingHoursArray.filter(Boolean).length}/19 horas abiertas`);
      }
    } catch (e) {
      console.warn('⚠️  No se pudieron parsear openingHours, usando horario completo');
    }
  }

  // Si no hay horarios configurados, usar horario por defecto (8 AM - 11 PM)
  if (openingHoursArray.length === 0) {
    openingHoursArray = Array.from({ length: 19 }, (_, i) => i >= 2 && i <= 17); // índices 2-17 = 8 AM - 11 PM
    console.log('🕐 Usando horario por defecto: 8 AM - 11 PM');
  }

  // Obtener TODOS los instructores activos con sus rangos de nivel y disponibilidad
  const instructors = await prisma.$queryRaw<Array<{id: string; hourlyRate: number; levelRanges: string | null; unavailableHours: string | null}>>`
    SELECT id, hourlyRate, levelRanges, unavailableHours FROM Instructor WHERE isActive = 1
  `;

  if (!instructors || instructors.length === 0) {
    return { created: 0, skipped: 0, error: 'No active instructors available' };
  }

  console.log(`📚 Generando propuestas para ${instructors.length} instructores`);

  // 🕐 PASO 2: Generar timeSlots SOLO para horarios de apertura
  // openingHoursArray[0] = 6 AM, [1] = 7 AM, ..., [18] = 12 AM (medianoche)
  const timeSlots: string[] = [];
  for (let i = 0; i < openingHoursArray.length; i++) {
    if (openingHoursArray[i]) {
      const hour = 6 + i; // 6 AM + índice
      timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
      timeSlots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
  }

  if (timeSlots.length === 0) {
    console.log('⚠️  Club cerrado este día - no se generarán propuestas');
    return { created: 0, skipped: 0, reason: 'Club closed' };
  }

  console.log(`🕐 Generando en ${timeSlots.length} franjas horarias (club abierto)`);

  // 🚀 OPTIMIZACIÓN: Obtener todas las tarjetas existentes de una vez
  const existingSlots = await prisma.$queryRaw<Array<{instructorId: string, start: bigint}>>`
    SELECT instructorId, start
    FROM TimeSlot
    WHERE clubId = ${clubId}
    AND courtId IS NULL
    AND date(start/1000, 'unixepoch') = date(${date})
  `;

  const existingMap = new Map<string, Set<number>>();
  existingSlots.forEach(slot => {
    if (!existingMap.has(slot.instructorId)) {
      existingMap.set(slot.instructorId, new Set());
    }
    existingMap.get(slot.instructorId)!.add(Number(slot.start));
  });

  // 🚀 OPTIMIZACIÓN: Obtener todas las clases confirmadas de una vez
  const confirmedClasses = await prisma.$queryRaw<Array<{instructorId: string, start: bigint, end: bigint}>>`
    SELECT instructorId, start, end
    FROM TimeSlot
    WHERE courtId IS NOT NULL
    AND date(start/1000, 'unixepoch') = date(${date})
  `;

  const confirmedMap = new Map<string, Array<{start: number, end: number}>>();
  confirmedClasses.forEach(cls => {
    if (!confirmedMap.has(cls.instructorId)) {
      confirmedMap.set(cls.instructorId, []);
    }
    confirmedMap.get(cls.instructorId)!.push({
      start: Number(cls.start),
      end: Number(cls.end)
    });
  });

  console.log(`📊 Optimización: ${existingSlots.length} slots existentes, ${confirmedClasses.length} clases confirmadas`);

  // Para cada instructor, generar propuestas en todos los horarios
  for (const instructor of instructors) {
    const instructorId = instructor.id;
    if (process.env.NODE_ENV !== 'production') {
      console.log(`   👤 Generando para instructor ${instructorId}...`);
    }

    // Parsear horarios de NO disponibilidad del instructor
    let unavailableHours: Record<string, Array<{start: string; end: string}>> = {};
    if (instructor.unavailableHours) {
      try {
        unavailableHours = JSON.parse(instructor.unavailableHours);
      } catch (e) {
        console.warn(`⚠️ Error parseando unavailableHours del instructor ${instructorId}`);
      }
    }

    // Obtener los rangos de NO disponibilidad del instructor para este día
    const instructorUnavailableRanges = unavailableHours[dayOfWeek] || [];

    for (const startTime of timeSlots) {
      const [hour, minute] = startTime.split(':').map(Number);
      // Todas las clases duran 60 minutos
      let endHour = hour + 1;
      let endMinute = minute;
      
      // Si la hora final es >= 24, ajustar (aunque no debería pasar con horario 09:00-18:00)
      if (endHour >= 24) {
        endHour = 23;
        endMinute = 59;
      }
      
      const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;

      // Verificar si el instructor está disponible en este horario
      // Función auxiliar para convertir "HH:MM" a minutos del día
      const timeToMinutes = (time: string): number => {
        const [h, m] = time.split(':').map(Number);
        return h * 60 + m;
      };

      const slotStartMin = timeToMinutes(startTime);
      const slotEndMin = timeToMinutes(endTime);

      // Verificar si hay conflicto con algún rango de NO disponibilidad
      let isInstructorAvailable = true;
      for (const unavailableRange of instructorUnavailableRanges) {
        const unavailableStartMin = timeToMinutes(unavailableRange.start);
        const unavailableEndMin = timeToMinutes(unavailableRange.end);
        
        // Hay conflicto si los rangos se solapan
        if (slotStartMin < unavailableEndMin && slotEndMin > unavailableStartMin) {
          isInstructorAvailable = false;
          break;
        }
      }

      // Si el instructor NO está disponible, saltar este horario
      if (!isInstructorAvailable) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`   ⏭️  Saltando ${startTime} - instructor no disponible`);
        }
        continue;
      }

      // Verificar disponibilidad del instructor específico
      const availability = await checkAvailability(date, startTime, endTime, instructorId);

      if (!availability.hasAvailability) {
        if (skippedCount < 1) {
          console.log(`   ⏭️  SKIP Example: ${startTime} for ${instructorId} - ${availability.reason}`);
        }
        skippedCount++;
        continue;
      }

      // Crear UNA SOLA clase con nivel ABIERTO (el nivel se asignará con la primera reserva)
      const startDateTime = new Date(`${date}T${startTime}:00.000Z`);
      const endDateTime = new Date(`${date}T${endTime}:00.000Z`);
      
      const level = 'ABIERTO';
      const category = 'ABIERTO'; // La categoría de género se asigna con la primera reserva
      
      // 🚀 Verificar si ya existe usando el mapa en memoria
      const instructorExisting = existingMap.get(instructorId);
      if (instructorExisting && instructorExisting.has(startDateTime.getTime())) {
        skippedCount++;
        continue;
      }

      // 🚀 Verificar si el instructor tiene una clase confirmada en este horario usando el mapa
      const instructorConfirmed = confirmedMap.get(instructorId) || [];
      const hasConflict = instructorConfirmed.some(cls => 
        startDateTime.getTime() < cls.end && endDateTime.getTime() > cls.start
      );

      if (hasConflict) {
        skippedCount++;
        continue;
      }

      // CREAR TARJETA ABIERTA
      const timeSlotId = `ts_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Calcular precio basado en franjas horarias
      const courtPrice = await getCourtPriceForTime(clubId, startDateTime);
      const instructorPrice = instructor.hourlyRate || 0;
      const totalPrice = instructorPrice + courtPrice;

      // Convertir fechas a timestamps numéricos para SQLite
      const startTimestamp = startDateTime.getTime();
      const endTimestamp = endDateTime.getTime();
      const nowTimestamp = Date.now();

      await prisma.$executeRaw`
        INSERT INTO TimeSlot (
          id, clubId, instructorId, start, end,
          maxPlayers, totalPrice, instructorPrice, courtRentalPrice, level, category, createdAt, updatedAt
        )
        VALUES (
          ${timeSlotId},
          ${clubId},
          ${instructorId},
          ${startTimestamp},
          ${endTimestamp},
          4,
          ${totalPrice},
          ${instructorPrice},
          ${courtPrice},
          ${level},
          ${category},
          ${nowTimestamp},
          ${nowTimestamp}
        )
      `;

      createdCount++;
    }
  }

  return { created: createdCount, skipped: skippedCount };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const targetDayParam = searchParams.get('targetDay');
    const daysRangeParam = searchParams.get('daysRange') || '30'; // Por defecto 30 días
    const daysRange = parseInt(daysRangeParam);

    const clubId = 'padel-estrella-madrid'; // Club principal (ID correcto)

    // Si se especifica targetDay, generar solo ese día (comportamiento legacy)
    if (targetDayParam) {
      const targetDay = parseInt(targetDayParam);
      console.log(`🤖 AUTO-GENERATOR: Generating cards for day +${targetDay}...`);

      const today = new Date();
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + targetDay);
      const dateStr = targetDate.toISOString().split('T')[0];

      console.log(`   📅 Target date: ${dateStr} (${targetDay} days from now)`);

      const result = await generateCardsForDay(dateStr, clubId);
      console.log(`   ✅ ${dateStr}: ${result.created} created, ${result.skipped} skipped`);

      return NextResponse.json({
        success: true,
        message: `Cards generated successfully for ${dateStr} (+${targetDay} days)`,
        created: result.created,
        skipped: result.skipped,
        targetDate: dateStr,
        daysAhead: targetDay
      });
    }

    // Nuevo comportamiento: generar para un rango completo de días
    console.log(`🤖 AUTO-GENERATOR: Generating cards for next ${daysRange} days...`);
    
    const results = [];
    let totalCreated = 0;
    let totalSkipped = 0;

    for (let day = 0; day <= daysRange; day++) {
      const today = new Date();
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + day);
      const dateStr = targetDate.toISOString().split('T')[0];

      const result = await generateCardsForDay(dateStr, clubId);
      
      if (result.created > 0 || day === 0 || day === daysRange) {
        console.log(`   📅 ${dateStr} (+${day}): ${result.created} created, ${result.skipped} skipped`);
      }

      totalCreated += result.created;
      totalSkipped += result.skipped;
      
      results.push({
        date: dateStr,
        daysAhead: day,
        created: result.created,
        skipped: result.skipped
      });
    }

    console.log(`   ✅ TOTAL: ${totalCreated} created, ${totalSkipped} skipped across ${daysRange + 1} days`);

    return NextResponse.json({
      success: true,
      message: `Cards generated successfully for ${daysRange + 1} days`,
      totalCreated,
      totalSkipped,
      daysRange,
      results
    });

  } catch (error) {
    console.error('❌ Error generating cards:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate cards',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
