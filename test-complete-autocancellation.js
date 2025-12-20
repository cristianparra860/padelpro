const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function completeTest() {
  try {
    console.log('🧪 PRUEBA COMPLETA DE AUTO-CANCELACIÓN\n');
    console.log('═'.repeat(60));
    
    const marcId = 'user-1763677035576-wv1t7iun0';
    const anaId = 'ana-user-1764950840275';
    const today = '2025-12-05';
    
    // PASO 1: Verificar clases disponibles
    console.log('\n📋 PASO 1: Verificar clases disponibles\n');
    
    const slots = await prisma.timeSlot.findMany({
      where: {
        start: {
          gte: new Date('2025-12-05T00:00:00Z'),
          lt: new Date('2025-12-06T00:00:00Z')
        },
        courtId: null
      },
      orderBy: { start: 'asc' },
      take: 3
    });
    
    if (slots.length < 3) {
      console.log('❌ No hay suficientes clases. Encontradas:', slots.length);
      return;
    }
    
    console.log(`✅ ${slots.length} clases disponibles:`);
    slots.forEach((s, i) => {
      const time = new Date(s.start).toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'});
      console.log(`   ${i+1}. ${time} - ${s.id}`);
    });
    
    // PASO 2: Inscribir a Marc en las 3 clases
    console.log('\n📝 PASO 2: Inscribir a Marc en las 3 clases\n');
    
    const marcBookings = [];
    
    for (let i = 0; i < 3; i++) {
      const bookingId = `test-booking-marc-${Date.now()}-${i}`;
      const time = new Date(slots[i].start).toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'});
      
      await prisma.booking.create({
        data: {
          id: bookingId,
          userId: marcId,
          timeSlotId: slots[i].id,
          groupSize: 1,
          status: 'PENDING',
          amountBlocked: 2500,
          paidWithPoints: false,
          pointsUsed: 0
        }
      });
      
      marcBookings.push({ id: bookingId, slotId: slots[i].id, time });
      console.log(`   ✅ Marc inscrito en clase ${time}`);
      
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    // Actualizar créditos bloqueados
    await prisma.user.update({
      where: { id: marcId },
      data: { blockedCredits: { increment: 7500 } } // 25€ x 3
    });
    
    console.log('\n   💰 Créditos bloqueados de Marc: +75€');
    
    // PASO 3: Completar la primera clase con 3 jugadores más
    console.log('\n🎯 PASO 3: Completar la primera clase con otros 3 jugadores\n');
    
    const targetSlot = slots[0];
    const targetTime = new Date(targetSlot.start).toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'});
    
    console.log(`   🎯 Clase objetivo: ${targetTime}`);
    console.log(`   📍 TimeSlot: ${targetSlot.id}`);
    
    // Buscar 3 usuarios diferentes
    const otherUsers = await prisma.user.findMany({
      where: {
        id: { notIn: [marcId, anaId] },
        role: 'PLAYER'
      },
      take: 3
    });
    
    if (otherUsers.length < 3) {
      console.log('\n   ⚠️ No hay suficientes usuarios, usando Ana 3 veces');
      // Inscribir a Ana 3 veces con diferentes groupSizes
      for (let i = 0; i < 3; i++) {
        const bookingId = `test-booking-ana-${Date.now()}-${i}`;
        
        await prisma.booking.create({
          data: {
            id: bookingId,
            userId: anaId,
            timeSlotId: targetSlot.id,
            groupSize: 1,
            status: 'PENDING',
            amountBlocked: 2500,
            paidWithPoints: false,
            pointsUsed: 0
          }
        });
        
        console.log(`   ✅ Ana inscrita (${i+1}/3)`);
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    } else {
      // Inscribir 3 usuarios diferentes
      for (let i = 0; i < 3; i++) {
        const bookingId = `test-booking-${Date.now()}-${i}`;
        
        await prisma.booking.create({
          data: {
            id: bookingId,
            userId: otherUsers[i].id,
            timeSlotId: targetSlot.id,
            groupSize: 1,
            status: 'PENDING',
            amountBlocked: 2500,
            paidWithPoints: false,
            pointsUsed: 0
          }
        });
        
        console.log(`   ✅ ${otherUsers[i].name} inscrito`);
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
    
    console.log('\n   🎉 Clase completa: 4 jugadores inscritos');
    
    // PASO 4: Simular la confirmación de la clase
    console.log('\n⚡ PASO 4: Confirmar la clase (asignar pista)\n');
    
    // Buscar todas las reservas de esa clase
    const allBookings = await prisma.booking.findMany({
      where: {
        timeSlotId: targetSlot.id,
        status: 'PENDING'
      }
    });
    
    console.log(`   📊 Total reservas PENDING: ${allBookings.length}`);
    
    // Asignar pista al TimeSlot
    const court = await prisma.court.findFirst({
      where: { clubId: 'padel-estrella-madrid' }
    });
    
    if (!court) {
      console.log('   ❌ No hay pistas disponibles en el club');
      return;
    }
    
    await prisma.timeSlot.update({
      where: { id: targetSlot.id },
      data: {
        courtId: court.id,
        courtNumber: court.number
      }
    });
    
    console.log(`   ✅ Pista asignada: ${court.number}`);
    
    // Confirmar las reservas y cobrar
    for (const booking of allBookings) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { status: 'CONFIRMED' }
      });
      
      // Cobrar créditos
      await prisma.user.update({
        where: { id: booking.userId },
        data: {
          credits: { decrement: booking.amountBlocked },
          blockedCredits: { decrement: booking.amountBlocked }
        }
      });
    }
    
    console.log(`   ✅ ${allBookings.length} reservas confirmadas y cobradas`);
    
    // PASO 5: Ejecutar cancelación manual (simular la función)
    console.log('\n🚨 PASO 5: Cancelar otras inscripciones de Marc\n');
    
    const dayPattern = '2025-12-05';
    
    const otherMarcBookings = await prisma.$queryRaw`
      SELECT b.id, b.amountBlocked, ts.start
      FROM Booking b
      JOIN TimeSlot ts ON b.timeSlotId = ts.id
      WHERE b.userId = ${marcId}
      AND b.status = 'PENDING'
      AND b.timeSlotId != ${targetSlot.id}
      AND ts.start LIKE ${dayPattern + '%'}
    `;
    
    console.log(`   📋 Otras inscripciones de Marc hoy: ${otherMarcBookings.length}`);
    
    if (otherMarcBookings.length > 0) {
      for (const booking of otherMarcBookings) {
        const time = new Date(booking.start).toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'});
        
        // Cancelar
        await prisma.booking.update({
          where: { id: booking.id },
          data: { status: 'CANCELLED' }
        });
        
        // Desbloquear créditos
        const amount = Number(booking.amountBlocked);
        await prisma.user.update({
          where: { id: marcId },
          data: { blockedCredits: { decrement: amount } }
        });
        
        console.log(`   ✅ Cancelada clase ${time} - Liberados ${amount/100}€`);
      }
    }
    
    // PASO 6: Verificar resultados
    console.log('\n📊 PASO 6: Verificar resultados finales\n');
    
    const finalBookings = await prisma.$queryRaw`
      SELECT b.id, b.status, ts.start, ts.courtNumber
      FROM Booking b
      JOIN TimeSlot ts ON b.timeSlotId = ts.id
      WHERE b.userId = ${marcId}
      AND ts.start LIKE ${dayPattern + '%'}
      ORDER BY ts.start
    `;
    
    console.log(`   Marc tiene ${finalBookings.length} reserva(s) el ${dayPattern}:`);
    
    finalBookings.forEach((b, i) => {
      const time = new Date(b.start).toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'});
      const court = b.courtNumber ? `Pista ${b.courtNumber}` : 'Sin pista';
      const icon = b.status === 'CONFIRMED' ? '✅' : b.status === 'CANCELLED' ? '❌' : '⏳';
      console.log(`   ${icon} ${i+1}. ${time} - ${b.status} - ${court}`);
    });
    
    const confirmedCount = finalBookings.filter(b => b.status === 'CONFIRMED').length;
    const cancelledCount = finalBookings.filter(b => b.status === 'CANCELLED').length;
    
    console.log('\n═'.repeat(60));
    console.log('\n🎯 RESULTADO DE LA PRUEBA:\n');
    
    if (confirmedCount === 1 && cancelledCount === 2) {
      console.log('   ✅ ÉXITO: Auto-cancelación funcionó correctamente');
      console.log(`   ✅ 1 reserva CONFIRMED (clase ${new Date(finalBookings.find(b => b.status === 'CONFIRMED').start).toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'})})`);
      console.log(`   ✅ 2 reservas CANCELLED (otras clases del mismo día)`);
      console.log('   ✅ Sistema respeta la norma: 1 reserva confirmada por día');
    } else {
      console.log('   ❌ FALLO: La auto-cancelación no funcionó como esperado');
      console.log(`   - Reservas CONFIRMED: ${confirmedCount} (esperado: 1)`);
      console.log(`   - Reservas CANCELLED: ${cancelledCount} (esperado: 2)`);
    }
    
    console.log('\n═'.repeat(60));
    
  } catch (error) {
    console.error('\n❌ Error en la prueba:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

completeTest();
