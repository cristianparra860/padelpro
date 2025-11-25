// Verificar y limpiar reservas huérfanas del 21 de noviembre a las 7:00
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAndCleanStuckBooking() {
  try {
    console.log('\n🔍 VERIFICANDO RESERVA BLOQUEADA DEL 21 A LAS 7:00\n');
    console.log('='.repeat(70));
    
    // Buscar el TimeSlot del 21 a las 7:00
    const targetDate = '2025-11-21T07:00:00.000Z';
    
    console.log('\n1️⃣ BUSCANDO TIMESLOT...');
    const timeSlots = await prisma.$queryRaw`
      SELECT id, start, end, courtNumber, level, totalPrice
      FROM TimeSlot
      WHERE start = ${targetDate}
      AND clubId = 'padel-estrella-madrid'
    `;
    
    if (timeSlots.length === 0) {
      console.log('❌ No se encontró TimeSlot para esa fecha/hora');
      return;
    }
    
    console.log(`✅ Encontrados ${timeSlots.length} TimeSlots:`);
    timeSlots.forEach(slot => {
      console.log(`   ID: ${slot.id}`);
      console.log(`   Pista asignada: ${slot.courtNumber || 'Sin asignar'}`);
      console.log(`   Horario: ${slot.start} - ${slot.end}`);
      console.log('   ---');
    });
    
    // Buscar todas las reservas para estos slots
    console.log('\n2️⃣ BUSCANDO RESERVAS ASOCIADAS...');
    for (const slot of timeSlots) {
      const bookings = await prisma.booking.findMany({
        where: { timeSlotId: slot.id },
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        }
      });
      
      console.log(`\n   TimeSlot: ${slot.id}`);
      console.log(`   Reservas encontradas: ${bookings.length}`);
      
      if (bookings.length === 0) {
        console.log('   ⚠️ Este slot NO tiene reservas pero puede tener pista asignada');
        
        if (slot.courtNumber) {
          console.log(`   🔧 Pista ${slot.courtNumber} está bloqueada sin reservas`);
          console.log('   📋 LIMPIANDO...');
          
          // Quitar la pista asignada
          await prisma.$executeRaw`
            UPDATE TimeSlot
            SET courtNumber = NULL
            WHERE id = ${slot.id}
          `;
          console.log('   ✅ Pista liberada');
          
          // Eliminar entradas en CourtSchedule
          const deletedCourtSchedule = await prisma.$executeRaw`
            DELETE FROM CourtSchedule
            WHERE timeSlotId = ${slot.id}
          `;
          console.log(`   ✅ Eliminadas ${deletedCourtSchedule} entradas de CourtSchedule`);
          
          // Eliminar entradas en InstructorSchedule
          const deletedInstructorSchedule = await prisma.$executeRaw`
            DELETE FROM InstructorSchedule
            WHERE timeSlotId = ${slot.id}
          `;
          console.log(`   ✅ Eliminadas ${deletedInstructorSchedule} entradas de InstructorSchedule`);
        }
      } else {
        bookings.forEach(booking => {
          console.log(`   - ${booking.user.name} (${booking.user.email})`);
          console.log(`     Status: ${booking.status} | Grupo: ${booking.groupSize}`);
        });
      }
    }
    
    console.log('\n3️⃣ VERIFICANDO SCHEDULES...');
    
    // Verificar CourtSchedule
    const courtSchedules = await prisma.$queryRaw`
      SELECT cs.*, ts.start, ts.courtNumber
      FROM CourtSchedule cs
      LEFT JOIN TimeSlot ts ON cs.timeSlotId = ts.id
      WHERE ts.start = ${targetDate}
      AND ts.clubId = 'padel-estrella-madrid'
    `;
    
    console.log(`\n   CourtSchedule entries: ${courtSchedules.length}`);
    if (courtSchedules.length > 0) {
      courtSchedules.forEach(cs => {
        console.log(`   - Court ${cs.courtNumber || 'N/A'} | TimeSlot: ${cs.timeSlotId}`);
      });
    }
    
    // Verificar InstructorSchedule
    const instructorSchedules = await prisma.$queryRaw`
      SELECT ins.*, ts.start
      FROM InstructorSchedule ins
      LEFT JOIN TimeSlot ts ON ins.timeSlotId = ts.id
      WHERE ts.start = ${targetDate}
      AND ins.date LIKE '2025-11-21%'
    `;
    
    console.log(`\n   InstructorSchedule entries: ${instructorSchedules.length}`);
    if (instructorSchedules.length > 0) {
      instructorSchedules.forEach(ins => {
        console.log(`   - Instructor ${ins.instructorId} | TimeSlot: ${ins.timeSlotId}`);
      });
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ VERIFICACIÓN Y LIMPIEZA COMPLETADA\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndCleanStuckBooking();
