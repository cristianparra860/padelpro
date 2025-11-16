const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSpecificSlot() {
  console.log('\n🔍 VERIFICANDO CLASE DEL 16/11 A LAS 7:00\n');
  
  // Buscar el TimeSlot del 16 de noviembre a las 7:00
  const targetDate = new Date('2025-11-16T06:00:00.000Z'); // 7:00 AM hora local
  const nextHour = new Date('2025-11-16T07:00:00.000Z');
  
  const slots = await prisma.timeSlot.findMany({
    where: {
      start: {
        gte: targetDate,
        lt: nextHour
      }
    },
    include: {
      bookings: true,
      instructor: true
    }
  });

  console.log(`Slots encontrados para 16/11 7:00 AM: ${slots.length}\n`);

  for (const slot of slots) {
    console.log(`📋 TimeSlot: ${slot.id}`);
    console.log(`   Start: ${new Date(slot.start).toLocaleString('es-ES')}`);
    console.log(`   Instructor: ${slot.instructor?.name || 'N/A'}`);
    console.log(`   CourtId: ${slot.courtId || 'NULL'}`);
    console.log(`   CourtNumber: ${slot.courtNumber || 'NULL'}`);
    console.log(`   Updated: ${new Date(slot.updatedAt).toLocaleString('es-ES')}`);
    
    console.log(`\n   Bookings (${slot.bookings.length}):`);
    if (slot.bookings.length === 0) {
      console.log(`   ❌ NO HAY BOOKINGS - TimeSlot huérfano!`);
    } else {
      slot.bookings.forEach((b, idx) => {
        console.log(`   ${idx + 1}. ID: ${b.id.substring(0, 20)}...`);
        console.log(`      Status: ${b.status}`);
        console.log(`      UserId: ${b.userId}`);
        console.log(`      Created: ${new Date(b.createdAt).toLocaleString('es-ES')}`);
        console.log(`      Updated: ${new Date(b.updatedAt).toLocaleString('es-ES')}`);
      });
    }

    const activeBookings = slot.bookings.filter(b => b.status === 'PENDING' || b.status === 'CONFIRMED');
    console.log(`\n   ⚠️ PROBLEMA: CourtId=${slot.courtId !== null}, Bookings activos=${activeBookings.length}`);
    
    if (slot.courtId !== null && activeBookings.length === 0) {
      console.log(`   ❌ ¡HUÉRFANO CONFIRMADO! Este TimeSlot tiene pista asignada pero NO tiene bookings activos.`);
      console.log(`   🔧 Debería limpiarse automáticamente.`);
    }
    console.log('');
  }

  await prisma.$disconnect();
}

checkSpecificSlot();
