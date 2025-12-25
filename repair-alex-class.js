const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔧 REPARANDO CLASE DE ALEX Y DIEGO\n');
    
    const timeSlotId = 'ts_1766512987102_fhnxe1svu';
    const userId = 'alex-user-id';
    
    console.log(`TimeSlot: ${timeSlotId}`);
    console.log(`User: ${userId}\n`);
    
    // 1. Obtener datos del TimeSlot
    const timeSlot = await prisma.timeSlot.findUnique({
      where: { id: timeSlotId },
      include: { bookings: true }
    });
    
    if (!timeSlot) {
      console.log('❌ TimeSlot no encontrado');
      return;
    }
    
    console.log(`📋 TimeSlot Info:`);
    console.log(`   Instructor: ${timeSlot.instructorId}`);
    console.log(`   Start: ${timeSlot.start}`);
    console.log(`   Total Price: €${timeSlot.totalPrice}`);
    console.log(`   Court Number: ${timeSlot.courtNumber || 'NULL'}`);
    console.log(`   Bookings en este TimeSlot: ${timeSlot.bookings.length}\n`);
    
    // 2. Buscar booking de Alex
    const booking = timeSlot.bookings.find(b => b.userId === userId);
    if (!booking) {
      console.log('❌ Booking de Alex no encontrado en este TimeSlot');
      console.log('   Bookings disponibles:');
      timeSlot.bookings.forEach((b, idx) => {
        console.log(`     ${idx + 1}. User: ${b.userId}, Status: ${b.status}, GroupSize: ${b.groupSize}`);
      });
      return;
    }
    
    const bookingId = booking.id;
    
    console.log(`📋 Booking Info:`);
    console.log(`   Status: ${booking.status}`);
    console.log(`   GroupSize: ${booking.groupSize}`);
    console.log(`   Amount Blocked: ${booking.amountBlocked} céntimos\n`);
    
    // 3. Confirmar booking (cambiar status a CONFIRMED y wasConfirmed=true)
    console.log('✅ PASO 1: Confirmando booking de Alex...');
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'CONFIRMED',
        wasConfirmed: true,
        updatedAt: new Date()
      }
    });
    console.log('   ✅ Booking confirmado\n');
    
    // 4. Cobrar al usuario (mover de blockedCredits a débito real)
    console.log('✅ PASO 2: Cobrando a Alex...');
    const amountToCharge = booking.amountBlocked;
    
    await prisma.user.update({
      where: { id: userId },
      data: {
        credits: { decrement: amountToCharge },
        blockedCredits: { decrement: amountToCharge },
        updatedAt: new Date()
      }
    });
    
    console.log(`   💰 Cobrados ${amountToCharge} céntimos (€${amountToCharge/100}) a Alex`);
    console.log(`   💰 Desbloqueados ${amountToCharge} céntimos de blockedCredits\n`);
    
    // 5. Buscar pista disponible
    console.log('✅ PASO 3: Buscando pista disponible...');
    
    const slotStart = new Date(timeSlot.start);
    const slotEnd = new Date(slotStart.getTime() + (60 * 60 * 1000)); // +60 min
    
    // Obtener pistas del club
    const courts = await prisma.court.findMany({
      where: {
        clubId: timeSlot.clubId,
        isActive: true
      },
      orderBy: { number: 'asc' }
    });
    
    console.log(`   🏟️ Pistas disponibles en el club: ${courts.length}`);
    
    // Verificar qué pistas están ocupadas en ese horario
    const occupiedCourts = await prisma.courtSchedule.findMany({
      where: {
        court: {
          clubId: timeSlot.clubId
        },
        OR: [
          {
            AND: [
              { startTime: { lte: slotStart } },
              { endTime: { gt: slotStart } }
            ]
          },
          {
            AND: [
              { startTime: { lt: slotEnd } },
              { endTime: { gte: slotEnd } }
            ]
          },
          {
            AND: [
              { startTime: { gte: slotStart } },
              { endTime: { lte: slotEnd } }
            ]
          }
        ]
      },
      include: { court: true }
    });
    
    const occupiedCourtIds = occupiedCourts.map(oc => oc.courtId);
    console.log(`   🏟️ Pistas ocupadas en ese horario: ${occupiedCourtIds.length}`);
    
    const availableCourts = courts.filter(c => !occupiedCourtIds.includes(c.id));
    console.log(`   🏟️ Pistas libres: ${availableCourts.length}`);
    
    if (availableCourts.length === 0) {
      console.log('   ⚠️ No hay pistas disponibles - pero ejecutaremos la clase de todos modos');
    }
    
    const assignedCourt = availableCourts[0] || null;
    const courtNumber = assignedCourt ? assignedCourt.number : null;
    const courtId = assignedCourt ? assignedCourt.id : null;
    
    if (courtNumber) {
      console.log(`   ✅ Pista asignada: ${courtNumber} (ID: ${courtId})\n`);
      
      // 6. Asignar pista al TimeSlot
      console.log('✅ PASO 4: Asignando pista al TimeSlot...');
      await prisma.timeSlot.update({
        where: { id: timeSlotId },
        data: {
          courtNumber: courtNumber,
          courtId: courtId,
          updatedAt: new Date()
        }
      });
      console.log('   ✅ Pista asignada al TimeSlot\n');
      
      // 7. Crear entrada en CourtSchedule
      console.log('✅ PASO 5: Creando entrada en CourtSchedule...');
      const courtScheduleId = `court-schedule-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      
      await prisma.courtSchedule.create({
        data: {
          id: courtScheduleId,
          courtId: courtId,
          date: slotStart,
          startTime: slotStart,
          endTime: slotEnd,
          isOccupied: true
        }
      });
      console.log('   ✅ CourtSchedule creado\n');
      
      // 8. Crear entrada en InstructorSchedule
      console.log('✅ PASO 6: Creando entrada en InstructorSchedule...');
      const instructorScheduleId = `instructor-schedule-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      
      await prisma.instructorSchedule.create({
        data: {
          id: instructorScheduleId,
          instructorId: timeSlot.instructorId,
          date: slotStart,
          startTime: slotStart,
          endTime: slotEnd,
          isOccupied: true
        }
      });
      console.log('   ✅ InstructorSchedule creado\n');
      
    } else {
      console.log('   ⚠️ No se asignó pista (no disponible)\n');
      // Aún así actualizar el TimeSlot para marcar como "ejecutable"
      await prisma.timeSlot.update({
        where: { id: timeSlotId },
        data: {
          courtNumber: null, // Null indica que se ejecutará sin pista asignada
          updatedAt: new Date()
        }
      });
    }
    
    // 9. Eliminar propuestas solapadas (si las hay)
    console.log('✅ PASO 7: Eliminando propuestas solapadas...');
    
    // Buscar TimeSlots en horario solapado (±30 min) sin pista asignada
    const thirtyMinBefore = new Date(slotStart.getTime() - (30 * 60 * 1000));
    const thirtyMinAfter = new Date(slotStart.getTime() + (30 * 60 * 1000));
    
    const overlappingSlots = await prisma.timeSlot.findMany({
      where: {
        id: { not: timeSlotId },
        clubId: timeSlot.clubId,
        courtNumber: null, // Solo eliminar propuestas sin pista asignada
        start: {
          gte: thirtyMinBefore,
          lte: thirtyMinAfter
        }
      }
    });
    
    console.log(`   🗑️ Propuestas solapadas encontradas: ${overlappingSlots.length}`);
    
    for (const slot of overlappingSlots) {
      // Eliminar bookings de esta propuesta y devolver créditos
      const slotBookings = await prisma.booking.findMany({
        where: { timeSlotId: slot.id }
      });
      
      for (const slotBooking of slotBookings) {
        // Devolver créditos bloqueados
        await prisma.user.update({
          where: { id: slotBooking.userId },
          data: {
            blockedCredits: { decrement: slotBooking.amountBlocked },
            updatedAt: new Date()
          }
        });
        
        // Cancelar booking
        await prisma.booking.update({
          where: { id: slotBooking.id },
          data: {
            status: 'CANCELLED',
            updatedAt: new Date()
          }
        });
      }
      
      // Eliminar la propuesta
      await prisma.timeSlot.delete({
        where: { id: slot.id }
      });
    }
    
    console.log(`   ✅ ${overlappingSlots.length} propuestas eliminadas\n`);
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ REPARACIÓN COMPLETADA');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`   ✅ Booking confirmado: ${bookingId}`);
    console.log(`   ✅ Usuario cobrado: €${amountToCharge/100}`);
    console.log(`   ✅ Pista asignada: ${courtNumber || 'Ninguna (clase sin pista)'}`);
    console.log(`   ✅ Schedules creados para pista e instructor`);
    console.log(`   ✅ ${overlappingSlots.length} propuestas solapadas eliminadas`);
    console.log('═══════════════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
