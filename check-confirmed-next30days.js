import { prisma } from './src/lib/prisma.ts';

async function checkConfirmedBookingsNext30Days() {
  try {
    console.log('🔍 REVISANDO RESERVAS CONFIRMADAS - Próximos 30 días\n');
    
    const today = new Date();
    const in30Days = new Date(today);
    in30Days.setDate(today.getDate() + 30);
    
    const startTimestamp = today.getTime();
    const endTimestamp = in30Days.getTime();
    
    console.log(`📅 Rango: ${today.toLocaleDateString('es-ES')} - ${in30Days.toLocaleDateString('es-ES')}`);
    console.log(`   Timestamps: ${startTimestamp} - ${endTimestamp}\n`);
    
    // 1. Buscar TimeSlots con courtId asignado (clases confirmadas)
    const confirmedSlots = await prisma.$queryRawUnsafe(`
      SELECT 
        ts.*,
        i.name as instructorName
      FROM TimeSlot ts
      LEFT JOIN Instructor i ON ts.instructorId = i.id
      WHERE ts.start >= ? AND ts.start <= ?
      AND ts.courtId IS NOT NULL
      ORDER BY ts.start ASC
    `, startTimestamp, endTimestamp);
    
    console.log(`🔵 TimeSlots CONFIRMADOS (courtId asignado): ${confirmedSlots.length}\n`);
    
    if (confirmedSlots.length === 0) {
      console.log('✅ No hay TimeSlots confirmados en los próximos 30 días');
      await prisma.$disconnect();
      return;
    }
    
    // 2. Para cada TimeSlot confirmado, buscar sus bookings
    console.log('📋 DETALLE DE CLASES CONFIRMADAS:\n');
    
    for (const slot of confirmedSlots) {
      const date = new Date(Number(slot.start));
      const time = date.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: 'Europe/Madrid'
      });
      const dateStr = date.toLocaleDateString('es-ES');
      
      console.log(`\n📅 ${dateStr} ${time}`);
      console.log(`   Instructor: ${slot.instructorName || 'Sin nombre'}`);
      console.log(`   Pista: ${slot.courtNumber || slot.courtId}`);
      console.log(`   Nivel: ${slot.level}`);
      console.log(`   Género: ${slot.genderCategory || 'N/A'}`);
      console.log(`   TimeSlot ID: ${slot.id}`);
      
      // Buscar bookings de este TimeSlot
      const bookings = await prisma.booking.findMany({
        where: {
          timeSlotId: slot.id
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });
      
      console.log(`   \n   👥 Reservas: ${bookings.length}`);
      
      if (bookings.length > 0) {
        bookings.forEach(b => {
          console.log(`      - ${b.user.name} (${b.user.email})`);
          console.log(`        Estado: ${b.status} | Grupo: ${b.groupSize || 'N/A'}`);
          console.log(`        Booking ID: ${b.id}`);
        });
      } else {
        console.log(`      ⚠️ CLASE CONFIRMADA SIN RESERVAS (anómalo)`);
      }
    }
    
    // 3. Resumen
    console.log('\n\n📊 RESUMEN:');
    console.log(`   Total clases confirmadas: ${confirmedSlots.length}`);
    
    // Contar bookings totales
    let totalBookings = 0;
    for (const slot of confirmedSlots) {
      const bookings = await prisma.booking.count({
        where: { timeSlotId: slot.id }
      });
      totalBookings += bookings;
    }
    
    console.log(`   Total reservas: ${totalBookings}`);
    
    // 4. También verificar si hay bookings huérfanos (sin TimeSlot)
    console.log('\n\n🔍 VERIFICANDO BOOKINGS HUÉRFANOS...');
    
    const allBookings = await prisma.booking.findMany({
      include: {
        timeSlot: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    const orphanBookings = allBookings.filter(b => !b.timeSlot);
    
    if (orphanBookings.length > 0) {
      console.log(`\n⚠️ BOOKINGS HUÉRFANOS (sin TimeSlot): ${orphanBookings.length}`);
      orphanBookings.forEach(b => {
        console.log(`   - ${b.user.name} (${b.user.email})`);
        console.log(`     Booking ID: ${b.id}`);
        console.log(`     TimeSlot ID: ${b.timeSlotId} (NO EXISTE)`);
      });
    } else {
      console.log('✅ No hay bookings huérfanos');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkConfirmedBookingsNext30Days();
