import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getCourtPriceForTime } from '@/lib/courtPricing';

const prisma = new PrismaClient();

/**
 * 🤖 API ENDPOINT: Generador automático de tarjetas
 * 
 * GET /api/cron/generate-cards?days=7
 * 
 * Genera propuestas de clases verificando disponibilidad de pistas e instructores.
 * Puede ser llamado por:
 * - Vercel Cron Jobs
 * - GitHub Actions
 * - Servicio externo (cron-job.org, etc.)
 */

// Verificar disponibilidad de pistas e instructores
async function checkAvailability(date: string, startTime: string, endTime: string) {
  const startDateTime = new Date(`${date}T${startTime}:00.000Z`);
  const endDateTime = new Date(`${date}T${endTime}:00.000Z`);
  
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

  const totalCourts = await prisma.$queryRaw<Array<{count: number}>>`
    SELECT COUNT(*) as count FROM Court WHERE isActive = 1
  `;
  const availableCourts = Number(totalCourts[0]?.count || 0) - occupiedCourts.length;

  // Verificar instructores ocupados
  const occupiedInstructors = await prisma.$queryRaw<Array<{instructorId: string}>>`
    SELECT DISTINCT instructorId 
    FROM InstructorSchedule
    WHERE date = ${date}
    AND isOccupied = 1
    AND (
      (startTime <= ${startDateTime.toISOString()} AND endTime > ${startDateTime.toISOString()})
      OR (startTime < ${endDateTime.toISOString()} AND endTime >= ${endDateTime.toISOString()})
      OR (startTime >= ${startDateTime.toISOString()} AND endTime <= ${endDateTime.toISOString()})
    )
  `;

  const totalInstructors = await prisma.$queryRaw<Array<{count: number}>>`
    SELECT COUNT(*) as count FROM Instructor WHERE isActive = 1
  `;
  const availableInstructors = Number(totalInstructors[0]?.count || 0) - occupiedInstructors.length;

  return {
    hasAvailability: availableCourts > 0 && availableInstructors > 0,
    availableCourts,
    availableInstructors,
    totalCourts: Number(totalCourts[0]?.count || 0),
    totalInstructors: Number(totalInstructors[0]?.count || 0)
  };
}

// Generar tarjetas para un día
async function generateCardsForDay(date: string, clubId: string) {
  let createdCount = 0;
  let skippedCount = 0;

  // Obtener TODOS los instructores activos
  const instructors = await prisma.$queryRaw<Array<{id: string}>>`
    SELECT id FROM Instructor WHERE isActive = 1
  `;

  if (!instructors || instructors.length === 0) {
    return { created: 0, skipped: 0, error: 'No active instructors available' };
  }

  console.log(`📚 Generando propuestas para ${instructors.length} instructores`);

  // Generar propuestas cada 30 minutos de 08:00 a 22:00
  const timeSlots: string[] = [];
  for (let hour = 8; hour < 22; hour++) {
    timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
    timeSlots.push(`${hour.toString().padStart(2, '0')}:30`);
  }

  // Para cada instructor, generar propuestas en todos los horarios
  for (const instructor of instructors) {
    const instructorId = instructor.id;
    console.log(`   👤 Generando para instructor ${instructorId}...`);

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

      // Verificar disponibilidad
      const availability = await checkAvailability(date, startTime, endTime);

      if (!availability.hasAvailability) {
        skippedCount++;
        continue;
      }

      // Verificar si ya existe una propuesta para este instructor
      const startDateTime = new Date(`${date}T${startTime}:00.000Z`);
      const endDateTime = new Date(`${date}T${endTime}:00.000Z`);
      
      const existing = await prisma.$queryRaw<Array<{id: string}>>`
        SELECT id FROM TimeSlot 
        WHERE clubId = ${clubId}
        AND instructorId = ${instructorId}
        AND start = ${startDateTime.toISOString()}
        AND courtId IS NULL
      `;

      if (existing && existing.length > 0) {
        skippedCount++;
        continue;
      }

      // Verificar si el instructor tiene una clase confirmada en este horario
      // Una clase confirmada bloquea desde su inicio hasta su fin
      const confirmedClass = await prisma.$queryRaw<Array<{id: string}>>`
        SELECT id FROM TimeSlot
        WHERE instructorId = ${instructorId}
        AND courtId IS NOT NULL
        AND start <= ${startDateTime.toISOString()}
        AND end > ${startDateTime.toISOString()}
      `;

      if (confirmedClass && confirmedClass.length > 0) {
        skippedCount++;
        continue; // El instructor está ocupado en este horario
      }

      // CREAR TARJETA
      const timeSlotId = `ts_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Calcular precio basado en franjas horarias
      const courtPrice = await getCourtPriceForTime(clubId, startDateTime);
      const instructorPrice = 15; // Precio por defecto del instructor
      const totalPrice = instructorPrice + courtPrice;

      await prisma.$executeRaw`
        INSERT INTO TimeSlot (
          id, clubId, instructorId, start, end,
          maxPlayers, totalPrice, instructorPrice, courtRentalPrice, level, category, createdAt, updatedAt
        )
        VALUES (
          ${timeSlotId},
          ${clubId},
          ${instructorId},
          ${startDateTime.toISOString()},
          ${endDateTime.toISOString()},
          4,
          ${totalPrice},
          ${instructorPrice},
          ${courtPrice},
          'ABIERTO',
          'ABIERTO',
          datetime('now'),
          datetime('now')
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
    const daysParam = searchParams.get('days') || '7';
    const days = parseInt(daysParam);

    console.log(`🤖 AUTO-GENERATOR: Generating cards for next ${days} days...`);

    const clubId = 'padel-estrella-madrid'; // Club principal (ID correcto)
    let totalCreated = 0;
    let totalSkipped = 0;

    const today = new Date();
    for (let dayOffset = 0; dayOffset < days; dayOffset++) {
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + dayOffset);
      const dateStr = targetDate.toISOString().split('T')[0];

      const result = await generateCardsForDay(dateStr, clubId);
      totalCreated += result.created;
      totalSkipped += result.skipped;

      console.log(`   ${dateStr}: ${result.created} created, ${result.skipped} skipped`);
    }

    return NextResponse.json({
      success: true,
      message: `Cards generated successfully for ${days} days`,
      created: totalCreated,
      skipped: totalSkipped,
      days: days
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
