import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

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

  // Obtener instructor Carlos (el instructor profesional)
  const instructor = await prisma.$queryRaw<Array<{id: string}>>`
    SELECT id FROM Instructor WHERE id = 'instructor-carlos' AND isActive = 1 LIMIT 1
  `;

  if (!instructor || instructor.length === 0) {
    return { created: 0, skipped: 0, error: 'Instructor Carlos not available' };
  }

  const instructorId = instructor[0].id;

  // Generar propuestas cada 30 minutos de 09:00 a 18:00
  const timeSlots: string[] = [];
  for (let hour = 9; hour < 18; hour++) {
    timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
    timeSlots.push(`${hour.toString().padStart(2, '0')}:30`);
  }

  for (const startTime of timeSlots) {
    const [hour, minute] = startTime.split(':').map(Number);
    const endHour = minute === 30 ? hour + 1 : hour;
    const endMinute = minute === 30 ? 30 : 0;
    const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;

    // Verificar disponibilidad
    const availability = await checkAvailability(date, startTime, endTime);

    if (!availability.hasAvailability) {
      skippedCount++;
      continue;
    }

    // Verificar si ya existe
    const startDateTime = new Date(`${date}T${startTime}:00.000Z`);
    const existing = await prisma.$queryRaw<Array<{id: string}>>`
      SELECT id FROM TimeSlot 
      WHERE clubId = ${clubId}
      AND start = ${startDateTime.toISOString()}
      AND courtNumber IS NULL
    `;

    if (existing && existing.length > 0) {
      skippedCount++;
      continue;
    }

    // CREAR TARJETA
    const endDateTime = new Date(`${date}T${endTime}:00.000Z`);
    const timeSlotId = `ts_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await prisma.$executeRaw`
      INSERT INTO TimeSlot (
        id, clubId, instructorId, start, end,
        maxPlayers, totalPrice, level, category, createdAt, updatedAt
      )
      VALUES (
        ${timeSlotId},
        ${clubId},
        ${instructorId},
        ${startDateTime.toISOString()},
        ${endDateTime.toISOString()},
        4,
        25.0,
        'ABIERTO',
        'ABIERTO',
        datetime('now'),
        datetime('now')
      )
    `;

    createdCount++;
  }

  return { created: createdCount, skipped: skippedCount };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const daysParam = searchParams.get('days') || '7';
    const days = parseInt(daysParam);

    console.log(`🤖 AUTO-GENERATOR: Generating cards for next ${days} days...`);

    const clubId = 'club-1'; // Cambiar según tu configuración
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
