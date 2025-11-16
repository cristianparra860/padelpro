const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkOrphanedSlots() {
  console.log('\n🔍 VERIFICANDO TIMESLOTS HUÉRFANOS (courtId SIN bookings activos)\n');
  
  // Buscar TimeSlots con courtId asignado
  const slotsWithCourt = await prisma.timeSlot.findMany({
    where: {
      courtId: { not: null }
    },
    include: {
      bookings: true,
      instructor: true
    },
    orderBy: {
      updatedAt: 'desc'
    },
    take: 20
  });

  console.log(`Total TimeSlots con courtId: ${slotsWithCourt.length}\n`);

  let orphanedCount = 0;

  for (const slot of slotsWithCourt) {
    const activeBookings = slot.bookings.filter(b => 
      b.status === 'PENDING' || b.status === 'CONFIRMED'
    );
    
    const cancelledBookings = slot.bookings.filter(b => b.status === 'CANCELLED');
    
    if (activeBookings.length === 0) {
      orphanedCount++;
      console.log(`❌ HUÉRFANO #${orphanedCount}:`);
      console.log(`   TimeSlot ID: ${slot.id}`);
      console.log(`   Start: ${new Date(slot.start).toLocaleString('es-ES')}`);
      console.log(`   CourtId: ${slot.courtId}`);
      console.log(`   CourtNumber: ${slot.courtNumber}`);
      console.log(`   Updated: ${new Date(slot.updatedAt).toLocaleString('es-ES')}`);
      console.log(`   Bookings totales: ${slot.bookings.length}`);
      console.log(`   Bookings activos: ${activeBookings.length}`);
      console.log(`   Bookings cancelados: ${cancelledBookings.length}`);
      
      // Mostrar detalles de los bookings
      slot.bookings.forEach((b, idx) => {
        console.log(`     ${idx + 1}. ${b.id} - Status: ${b.status} - Updated: ${new Date(b.updatedAt).toLocaleString('es-ES')}`);
      });
      
      console.log('');
    }
  }

  console.log(`\n📊 RESUMEN:`);
  console.log(`   TimeSlots con courtId: ${slotsWithCourt.length}`);
  console.log(`   TimeSlots huérfanos (courtId sin bookings activos): ${orphanedCount}`);
  
  if (orphanedCount > 0) {
    console.log(`\n⚠️ PROBLEMA CONFIRMADO: Hay ${orphanedCount} TimeSlots que tienen courtId`);
    console.log(`   asignado pero NO tienen bookings activos. Esto significa que la`);
    console.log(`   lógica de limpieza NO se ejecutó al cancelar esos bookings.`);
  }

  await prisma.$disconnect();
}

checkOrphanedSlots();
