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

    // ℹ️ El instructor puede marcar/desmarcar plazas con puntos en cualquier momento
    // Las reservas existentes no se afectan - solo las NUEVAS reservas usarán puntos

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

    // 🎁 NUEVA LÓGICA: Si el instructor convirtió una plaza, verificar si completa la modalidad
    if (action === 'add' && instructorId) {
      console.log('🎁 Instructor convirtió plaza - verificando si completa modalidad...');
      
      // Obtener bookings activos de esta clase
      const activeBookings = await prisma.$queryRaw`
        SELECT id, userId, groupSize, status 
        FROM Booking 
        WHERE timeSlotId = ${timeSlotId} 
        AND status IN ('PENDING', 'CONFIRMED')
      ` as Array<{id: string, userId: string, groupSize: number, status: string}>;
      
      console.log(`   📊 Bookings activos: ${activeBookings.length}`);
      
      // Calcular plazas ocupadas por modalidad
      const plazasPorModalidad = [1, 2, 3, 4].map(modalidad => {
        const bookingsDeModalidad = activeBookings.filter(b => b.groupSize === modalidad);
        const plazasOcupadas = bookingsDeModalidad.reduce((sum, b) => sum + b.groupSize, 0);
        const plazasIndividuales = activeBookings.filter(b => b.groupSize === 1).length;
        
        // Para modalidades > 1, las plazas individuales cuentan
        const totalPlazas = modalidad === 1 
          ? plazasOcupadas 
          : plazasOcupadas + (modalidad > 1 ? plazasIndividuales : 0);
        
        return { modalidad, plazasOcupadas: totalPlazas, faltantes: modalidad - totalPlazas };
      });
      
      console.log('   📊 Plazas por modalidad:', plazasPorModalidad);
      
      // Verificar si el slotIndex convertido completa alguna modalidad
      const modalidadACompletar = plazasPorModalidad.find(m => 
        m.modalidad === slotIndex && m.faltantes === 1
      );
      
      if (modalidadACompletar) {
        console.log(`   🎯 ¡La conversión completa la modalidad ${slotIndex}!`);
        console.log('   💰 Creando booking del instructor para completar...');
        
        // Crear booking del instructor (pre-pago de la última plaza)
        const instructorBookingId = `instructor-subsidy-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        
        // Obtener precio de la clase
        const totalPrice = timeSlot?.totalPrice || 0;
        const pricePerSlot = totalPrice / slotIndex;
        const amountInCents = Math.floor(pricePerSlot * 100); // Convertir a céntimos
        
        await prisma.$executeRaw`
          INSERT INTO Booking (
            id, userId, timeSlotId, groupSize, status, 
            amountBlocked, paidWithPoints, isInstructorSubsidy, createdAt, updatedAt
          ) VALUES (
            ${instructorBookingId}, ${instructorId}, ${timeSlotId}, 1, 'CONFIRMED',
            ${amountInCents}, 0, 1, datetime('now'), datetime('now')
          )
        `;
        
        // Cobrar al instructor
        await prisma.$executeRaw`
          UPDATE User 
          SET credits = credits - ${amountInCents}, updatedAt = datetime('now')
          WHERE id = ${instructorId}
        `;
        
        console.log(`   ✅ Booking del instructor creado: ${instructorBookingId}`);
        console.log(`   💰 Cobrados ${pricePerSlot}€ (${amountInCents} céntimos) al instructor`);
        
        // 🎾 ASIGNAR PISTA A LA CLASE (importar función desde book/route)
        // Como la función está en otro archivo, copiamos la lógica aquí
        console.log(`   🎾 Intentando asignar pista a la clase...`);
        
        try {
          // Verificar si ya tiene pista asignada
          const currentTimeSlot = await prisma.$queryRaw`
            SELECT courtNumber FROM TimeSlot WHERE id = ${timeSlotId}
          ` as Array<{courtNumber: number | null}>;
          
          if (!currentTimeSlot[0]?.courtNumber) {
            // Obtener datos del slot
            const timeSlotData = await prisma.$queryRaw`
              SELECT start, end, clubId, instructorId FROM TimeSlot WHERE id = ${timeSlotId}
            ` as Array<{start: string, end: string, clubId: string, instructorId: string}>;
            
            const { clubId, instructorId: slotInstructorId } = timeSlotData[0];
            const slotStart = new Date(timeSlotData[0].start);
            const slotEnd = new Date(slotStart.getTime() + (60 * 60 * 1000)); // +60 min
            const start = slotStart.toISOString();
            const end = slotEnd.toISOString();
            
            // Buscar pistas ocupadas
            const occupiedByClasses = await prisma.$queryRaw`
              SELECT courtNumber FROM TimeSlot 
              WHERE clubId = ${clubId}
              AND courtNumber IS NOT NULL
              AND id != ${timeSlotId}
              AND start < ${end}
              AND end > ${start}
              GROUP BY courtNumber
            ` as Array<{courtNumber: number}>;
            
            const occupiedBySchedule = await prisma.$queryRaw`
              SELECT c.number as courtNumber
              FROM CourtSchedule cs
              JOIN Court c ON cs.courtId = c.id
              WHERE c.clubId = ${clubId}
              AND cs.isOccupied = 1
              AND cs.startTime < ${end}
              AND cs.endTime > ${start}
            ` as Array<{courtNumber: number}>;
            
            const occupiedCourtNumbers = [
              ...occupiedByClasses.map(c => c.courtNumber),
              ...occupiedBySchedule.map(c => c.courtNumber)
            ];
            
            // Obtener pistas del club
            const clubCourts = await prisma.$queryRaw`
              SELECT number FROM Court 
              WHERE clubId = ${clubId}
              AND isActive = 1
              ORDER BY number ASC
            ` as Array<{number: number}>;
            
            // Encontrar primera pista disponible
            let courtAssigned: number | null = null;
            for (const court of clubCourts) {
              if (!occupiedCourtNumbers.includes(court.number)) {
                courtAssigned = court.number;
                break;
              }
            }
            
            if (courtAssigned) {
              console.log(`   ✅ Pista encontrada: ${courtAssigned}`);
              
              // Obtener courtId
              const courtInfo = await prisma.$queryRaw`
                SELECT id FROM Court WHERE number = ${courtAssigned} AND clubId = ${clubId} LIMIT 1
              ` as Array<{id: string}>;
              
              const assignedCourtId = courtInfo[0]?.id;
              
              // Extender slot a 60 minutos si es necesario
              const currentStart = timeSlotData[0].start;
              const currentEnd = timeSlotData[0].end;
              const durationMinutes = (Number(new Date(currentEnd)) - Number(new Date(currentStart))) / (1000 * 60);
              
              if (durationMinutes === 30) {
                const newEndTimestamp = Number(new Date(currentStart)) + (60 * 60 * 1000);
                await prisma.$executeRaw`
                  UPDATE TimeSlot 
                  SET end = ${newEndTimestamp}, courtId = ${assignedCourtId}, courtNumber = ${courtAssigned}, updatedAt = datetime('now')
                  WHERE id = ${timeSlotId}
                `;
              } else {
                await prisma.$executeRaw`
                  UPDATE TimeSlot 
                  SET courtId = ${assignedCourtId}, courtNumber = ${courtAssigned}, updatedAt = datetime('now')
                  WHERE id = ${timeSlotId}
                `;
              }
              
              // Marcar pista ocupada en schedules
              const courtScheduleId = `cs-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
              await prisma.$executeRaw`
                INSERT INTO CourtSchedule (id, courtId, startTime, endTime, isOccupied, createdAt, updatedAt)
                VALUES (${courtScheduleId}, ${assignedCourtId}, ${start}, ${end}, 1, datetime('now'), datetime('now'))
              `;
              
              const instructorScheduleId = `is-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
              await prisma.$executeRaw`
                INSERT INTO InstructorSchedule (id, instructorId, startTime, endTime, isOccupied, createdAt, updatedAt)
                VALUES (${instructorScheduleId}, ${slotInstructorId}, ${start}, ${end}, 1, datetime('now'), datetime('now'))
              `;
              
              console.log(`   ✅ Pista ${courtAssigned} asignada y marcada como ocupada`);
            } else {
              console.log(`   ⚠️ No hay pistas disponibles en este horario`);
            }
          } else {
            console.log(`   ℹ️ La clase ya tiene pista asignada: ${currentTimeSlot[0].courtNumber}`);
          }
        } catch (error) {
          console.error(`   ❌ Error asignando pista:`, error);
          // No fallar la conversión si hay error en asignación de pista
        }
      } else {
        console.log('   ℹ️ La conversión no completa ninguna modalidad aún');
      }
    }

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
