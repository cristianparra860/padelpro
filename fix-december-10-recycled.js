const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixDecember10Recycled() {
  console.log('🔍 Buscando clases del 10 de diciembre con pista asignada y sin usuarios activos...\n');
  
  // Buscar TimeSlots del 10 de diciembre con courtNumber asignado
  const dec10Start = new Date('2025-12-10T00:00:00.000Z');
  const dec10End = new Date('2025-12-10T23:59:59.999Z');
  
  const slots = await prisma.timeSlot.findMany({
    where: {
      start: {
        gte: dec10Start,
        lte: dec10End
      },
      courtNumber: {
        not: null
      }
    },
    include: {
      bookings: true
    }
  });
  
  console.log(`📊 Clases confirmadas del 10/12: ${slots.length}\n`);
  
  let updated = 0;
  
  for (const slot of slots) {
    const activeBookings = slot.bookings.filter(b => b.status !== 'CANCELLED');
    const cancelledBookings = slot.bookings.filter(b => b.status === 'CANCELLED');
    const time = new Date(slot.start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    
    console.log(`\n📋 Clase ${time} - Pista ${slot.courtNumber}`);
    console.log(`   TimeSlot: ${slot.id}`);
    console.log(`   Total bookings: ${slot.bookings.length}`);
    console.log(`   Activos: ${activeBookings.length}`);
    console.log(`   Cancelados: ${cancelledBookings.length}`);
    
    if (slot.bookings.length > 0) {
      slot.bookings.forEach(b => {
        console.log(`   - ${b.id.substring(0, 20)}... Status: ${b.status}, isRecycled: ${b.isRecycled}`);
      });
    }
    
    // Si no hay bookings activos y hay bookings cancelados
    if (activeBookings.length === 0 && cancelledBookings.length > 0) {
      const time = new Date(slot.start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      console.log(`♻️ Clase RECICLADA encontrada - ${time} Pista ${slot.courtNumber}`);
      console.log(`   TimeSlot: ${slot.id}`);
      console.log(`   Bookings cancelados: ${cancelledBookings.length}`);
      
      // Marcar todos los bookings cancelados como reciclados
      for (const booking of cancelledBookings) {
        if (!booking.isRecycled) {
          await prisma.booking.update({
            where: { id: booking.id },
            data: { isRecycled: true }
          });
          console.log(`   ✅ Booking ${booking.id.substring(0, 20)}... marcado como reciclado`);
          updated++;
        }
      }
      
      // Actualizar el TimeSlot
      await prisma.timeSlot.update({
        where: { id: slot.id },
        data: {
          hasRecycledSlots: true,
          availableRecycledSlots: cancelledBookings.length,
          recycledSlotsOnlyPoints: true
        }
      });
      console.log(`   ✅ TimeSlot actualizado\n`);
    }
  }
  
  console.log(`\n📊 Resumen:`);
  console.log(`   - Bookings marcados como reciclados: ${updated}`);
  
  await prisma.$disconnect();
}

fixDecember10Recycled();
