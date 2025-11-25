// src/app/api/classes/cancel/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { 
  updateUserBlockedCredits, 
  grantCompensationPoints, 
  markSlotAsRecycled 
} from '@/lib/blockedCredits';
import { createTransaction } from '@/lib/transactionLogger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId, userId, timeSlotId } = body;

    console.log('🗑️ Solicitud de cancelación:', { bookingId, userId, timeSlotId });

    // Verificar que tenemos los datos necesarios
    if (!userId || !timeSlotId) {
      return NextResponse.json({ 
        error: 'Faltan datos requeridos: userId y timeSlotId' 
      }, { status: 400 });
    }

    // Buscar la reserva del usuario para esta clase usando raw SQL
    const bookingQuery = await prisma.$queryRaw`
      SELECT * FROM Booking 
      WHERE userId = ${userId} 
      AND timeSlotId = ${timeSlotId}
      AND status IN ('PENDING', 'CONFIRMED')
      LIMIT 1
    ` as Array<{id: string, userId: string, timeSlotId: string, groupSize: number, status: string}>;

    console.log('🔍 Búsqueda de reserva:', { userId, timeSlotId, encontradas: bookingQuery?.length || 0 });

    if (!bookingQuery || bookingQuery.length === 0) {
      console.log('❌ No se encontró reserva activa');
      return NextResponse.json({ 
        error: 'No se encontró la reserva para cancelar' 
      }, { status: 404 });
    }

    const booking = bookingQuery[0];
    console.log('✅ Reserva encontrada:', { id: booking.id, status: booking.status, groupSize: booking.groupSize });

    // 1️⃣ Obtener información del TimeSlot para reembolso
    const timeSlotQuery = await prisma.$queryRaw`
      SELECT totalPrice, courtId, courtNumber, start, end, instructorId 
      FROM TimeSlot 
      WHERE id = ${timeSlotId}
    ` as Array<{totalPrice: number, courtId: string | null, courtNumber: number | null, start: string, end: string, instructorId: string}>;

    if (!timeSlotQuery || timeSlotQuery.length === 0) {
      return NextResponse.json({ 
        error: 'No se encontró información de la clase' 
      }, { status: 404 });
    }

    const timeSlotInfo = timeSlotQuery[0];
    const isConfirmedClass = timeSlotInfo.courtNumber !== null; // Tiene pista asignada = confirmada
    
    console.log(`📍 Clase ${isConfirmedClass ? 'CONFIRMADA' : 'PENDIENTE'} (pista: ${timeSlotInfo.courtNumber || 'ninguna'})`);
    
    // Obtener información del booking para saber cuánto estaba bloqueado
    const bookingInfo = await prisma.booking.findUnique({
      where: { id: booking.id },
      select: { amountBlocked: true, status: true }
    });
    
    const amountBlocked = bookingInfo?.amountBlocked || 0;
    const isPending = bookingInfo?.status === 'PENDING';
    
    console.log(`💰 Monto bloqueado: €${(amountBlocked/100).toFixed(2)}, Status: ${bookingInfo?.status}`);
    
    // LÓGICA DIFERENTE SEGÚN SI ES PENDIENTE O CONFIRMADA
    if (isPending || !isConfirmedClass) {
      // ✅ CANCELACIÓN DE RESERVA PENDIENTE (sin pista asignada)
      console.log('🔓 Cancelación PENDIENTE - Desbloqueando saldo...');
      
      // Marcar como cancelada
      await prisma.$executeRaw`
        UPDATE Booking 
        SET status = 'CANCELLED', updatedAt = datetime('now')
        WHERE id = ${booking.id}
      `;
      
      console.log('✅ Reserva marcada como CANCELLED en la BD');
      
      // Verificar que se actualizó correctamente
      const verificacion = await prisma.booking.findUnique({
        where: { id: booking.id },
        select: { status: true }
      });
      console.log('🔍 Verificación después de UPDATE:', verificacion);
      
      // Actualizar blockedCredits del usuario (se recalcula automáticamente)
      const newBlockedAmount = await updateUserBlockedCredits(userId);
      
      // 📝 REGISTRAR TRANSACCIÓN DE DESBLOQUEO
      const userBalance = await prisma.user.findUnique({
        where: { id: userId },
        select: { credits: true, blockedCredits: true }
      });
      
      if (userBalance) {
        await createTransaction({
          userId,
          type: 'credit',
          action: 'unblock',
          amount: amountBlocked,
          balance: userBalance.credits - userBalance.blockedCredits,
          concept: `Cancelación manual - Clase ${new Date(timeSlotInfo.start).toLocaleString('es-ES')}`,
          relatedId: booking.id,
          relatedType: 'booking',
          metadata: {
            timeSlotId,
            groupSize: booking.groupSize,
            status: 'CANCELLED',
            reason: 'Cancelación del usuario'
          }
        });
      }
      
      console.log(`✅ Saldo desbloqueado. Nuevo blockedCredits: €${(newBlockedAmount/100).toFixed(2)}`);
      
      return NextResponse.json({ 
        success: true,
        message: 'Reserva pendiente cancelada. Saldo desbloqueado',
        cancelledBookingId: booking.id,
        amountUnblocked: amountBlocked / 100,
        pointsGranted: 0,
        slotMarkedAsRecycled: false
      });
      
    } else {
      // ❌ CANCELACIÓN DE RESERVA CONFIRMADA (clase con pista asignada)
      console.log('♻️ Cancelación CONFIRMADA - Otorgando puntos y reciclando plaza...');
      
      // Marcar como cancelada
      console.log('🔵 [CANCEL] Paso 1: Marcando booking como CANCELLED...');
      await prisma.$executeRaw`
        UPDATE Booking 
        SET status = 'CANCELLED', updatedAt = datetime('now')
        WHERE id = ${booking.id}
      `;
      console.log('✅ [CANCEL] Booking marcado como CANCELLED');
      
      // Verificar si quedan reservas activas en esta clase
      console.log('🔵 [CANCEL] Paso 2: Contando reservas activas restantes...');
      const remainingBookings = await prisma.$queryRaw`
        SELECT COUNT(*) as count FROM Booking
        WHERE timeSlotId = ${timeSlotId}
        AND status IN ('PENDING', 'CONFIRMED')
      ` as Array<{count: number}>;
      
      const hasRemainingBookings = remainingBookings[0]?.count > 0;
      
      console.log(`📊 [CANCEL] Reservas activas restantes: ${remainingBookings[0]?.count}`);
      console.log(`📊 [CANCEL] hasRemainingBookings = ${hasRemainingBookings}`);
      
      // Si NO quedan reservas activas, liberar la clase (quitar pista y volver a propuesta)
      if (!hasRemainingBookings) {
        console.log('🔓 [CANCEL] ¡NO HAY RESERVAS ACTIVAS! Iniciando limpieza de TimeSlot...');
        
        try {
          // RESETEAR COMPLETAMENTE LA CLASE: pista, categoría de género Y NIVEL
          console.log('🔵 [CANCEL] Paso 3a: Limpiando courtId, genderCategory y level del TimeSlot...');
          const updateResult = await prisma.$executeRaw`
            UPDATE TimeSlot
            SET courtId = NULL, courtNumber = NULL, genderCategory = NULL, level = 'ABIERTO', updatedAt = datetime('now')
            WHERE id = ${timeSlotId}
          `;
          console.log(`✅ [CANCEL] TimeSlot limpiado y restaurado a ABIERTO (filas afectadas: ${updateResult})`);
          
          // 🆕 CREAR NUEVA TARJETA ABIERTA (nivel=ABIERTO, categoria=mixto)
          // Solo si NO existe ya otra tarjeta abierta para este instructor/hora
          console.log('🆕 [CANCEL] Verificando si crear nueva tarjeta ABIERTA...');
          
          const existingOpenSlot = await prisma.$queryRaw`
            SELECT id FROM TimeSlot
            WHERE instructorId = ${timeSlotInfo.instructorId}
            AND start = ${timeSlotInfo.start}
            AND level = 'ABIERTO'
            AND (genderCategory IS NULL OR genderCategory = 'mixto')
            AND id != ${timeSlotId}
            LIMIT 1
          ` as Array<{id: string}>;
          
          if (existingOpenSlot.length === 0) {
            console.log('🆕 [CANCEL] No existe tarjeta ABIERTA, creando nueva...');
            
            // Obtener info del club
            const instructorInfo = await prisma.instructor.findUnique({
              where: { id: timeSlotInfo.instructorId },
              select: { clubId: true }
            });
            
            if (instructorInfo) {
              const newOpenSlotId = `ts_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              
              await prisma.$executeRaw`
                INSERT INTO TimeSlot (
                  id, clubId, instructorId, start, end, maxPlayers, 
                  totalPrice, instructorPrice, courtRentalPrice, 
                  level, category, genderCategory, createdAt, updatedAt
                )
                VALUES (
                  ${newOpenSlotId},
                  ${instructorInfo.clubId},
                  ${timeSlotInfo.instructorId},
                  ${timeSlotInfo.start},
                  ${timeSlotInfo.end},
                  4,
                  ${timeSlotInfo.totalPrice},
                  ${timeSlotInfo.instructorPrice},
                  ${timeSlotInfo.courtRentalPrice},
                  'ABIERTO',
                  'clases',
                  'mixto',
                  datetime('now'),
                  datetime('now')
                )
              `;
              
              console.log(`✅ [CANCEL] Nueva tarjeta ABIERTA creada: ${newOpenSlotId}`);
            }
          } else {
            console.log('ℹ️ [CANCEL] Ya existe una tarjeta ABIERTA para este instructor/hora, no se crea duplicado');
          }
          
          // Liberar la pista en CourtSchedule
          console.log('🔵 [CANCEL] Paso 3b: Eliminando CourtSchedule...');
          const courtSchedResult = await prisma.$executeRaw`
            DELETE FROM CourtSchedule
            WHERE timeSlotId = ${timeSlotId}
          `;
          console.log(`✅ [CANCEL] CourtSchedule eliminado (filas: ${courtSchedResult})`);
          
          // Liberar el instructor en InstructorSchedule
          console.log('🔵 [CANCEL] Paso 3c: Eliminando InstructorSchedule...');
          const instrSchedResult = await prisma.$executeRaw`
            DELETE FROM InstructorSchedule
            WHERE timeSlotId = ${timeSlotId}
          `;
          console.log(`✅ [CANCEL] InstructorSchedule eliminado (filas: ${instrSchedResult})`);
        } catch (cleanupError) {
          console.error('❌ [CANCEL] ERROR durante limpieza:', cleanupError);
          throw cleanupError;
        }
        
        // 🔄 REGENERAR PROPUESTAS 30MIN ANTES que fueron eliminadas al confirmar la clase
        const startTime = new Date(timeSlotInfo.start);
        const thirtyMinBefore = new Date(startTime.getTime() - 30 * 60 * 1000);
        const oneHourBefore = new Date(startTime.getTime() - 60 * 60 * 1000);
        
        console.log(`🔄 Regenerando propuestas eliminadas entre ${oneHourBefore.toLocaleTimeString('es-ES')} y ${thirtyMinBefore.toLocaleTimeString('es-ES')}`);
        
        // Verificar qué propuestas faltan para este instructor en ese rango
        const existingProposals = await prisma.timeSlot.findMany({
          where: {
            instructorId: timeSlotInfo.instructorId,
            start: {
              gte: oneHourBefore,
              lt: startTime
            },
            courtNumber: null
          }
        });
        
        console.log(`   Propuestas existentes en ese rango: ${existingProposals.length}`);
        
        // Regenerar las que faltan (deberían ser 2: una a -60min y otra a -30min)
        const expectedSlots = [oneHourBefore, thirtyMinBefore];
        const existingStarts = new Set(existingProposals.map(p => new Date(p.start).getTime()));
        
        let regenerated = 0;
        
        for (const slotStart of expectedSlots) {
          if (!existingStarts.has(slotStart.getTime())) {
            const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);
            
            try {
              // Obtener datos del club del instructor
              const instructor = await prisma.instructor.findUnique({
                where: { id: timeSlotInfo.instructorId },
                select: { clubId: true }
              });
              
              if (instructor) {
                await prisma.timeSlot.create({
                  data: {
                    clubId: instructor.clubId,
                    instructorId: timeSlotInfo.instructorId,
                    start: slotStart,
                    end: slotEnd,
                    maxPlayers: 4,
                    totalPrice: 25.00,
                    instructorPrice: 10.00,
                    courtRentalPrice: 15.00,
                    level: 'ABIERTO',
                    category: 'clases'
                  }
                });
                
                regenerated++;
                console.log(`   ✅ Regenerada propuesta: ${slotStart.toLocaleTimeString('es-ES')}`);
              }
            } catch (error) {
              console.log(`   ⚠️ No se pudo regenerar ${slotStart.toLocaleTimeString('es-ES')}:`, error instanceof Error ? error.message : 'Error');
            }
          }
        }
        
        console.log(`✅ Clase liberada: pista y schedules eliminados, género reseteado, ${regenerated} propuestas regeneradas`);
      }
      
      // Otorgar puntos de compensación (1€ = 1 punto)
      const newPoints = await grantCompensationPoints(userId, amountBlocked);
      const pointsGranted = Math.floor(amountBlocked / 100);
      
      console.log(`🎁 Otorgados ${pointsGranted} puntos al usuario. Total puntos: ${newPoints}`);
      
      // 📝 REGISTRAR TRANSACCIÓN DE PUNTOS (con el balance actualizado)
      await createTransaction({
        userId,
        type: 'points',
        action: 'add',
        amount: pointsGranted,
        balance: newPoints, // Balance después de sumar los puntos
        concept: `Compensación por cancelación - Clase ${new Date(timeSlotInfo.start).toLocaleString('es-ES')}`,
        relatedId: booking.id,
        relatedType: 'booking',
        metadata: {
          timeSlotId,
          groupSize: booking.groupSize,
          status: 'CANCELLED',
          reason: 'Clase confirmada cancelada por usuario',
          originalAmount: amountBlocked
        }
      });
      
      // Marcar la plaza como reciclada en el TimeSlot (solo si aún quedan reservas)
      if (hasRemainingBookings) {
        await markSlotAsRecycled(timeSlotId);
        console.log(`♻️ TimeSlot marcado con plaza reciclada (hasRecycledSlots = true)`);
      }
      
      return NextResponse.json({ 
        success: true,
        message: hasRemainingBookings 
          ? `Reserva cancelada. Has recibido ${pointsGranted} puntos de compensación. La plaza queda disponible para reservar con puntos.`
          : `Reserva cancelada. Has recibido ${pointsGranted} puntos de compensación. La clase ha sido liberada y está disponible para nuevas reservas.`,
        cancelledBookingId: booking.id,
        amountUnblocked: 0, // No se desbloquea porque ya estaba cobrado
        pointsGranted: pointsGranted,
        slotMarkedAsRecycled: hasRemainingBookings,
        classFreed: !hasRemainingBookings
      });
    }

  } catch (error) {
    console.error('❌ Error cancelando reserva:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor al cancelar la reserva',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}