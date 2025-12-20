const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRecycledBookings() {
  console.log('🔍 Verificando bookings con isRecycled=true...\n');
  
  const recycledBookings = await prisma.booking.findMany({
    where: {
      status: 'CANCELLED',
      isRecycled: true
    },
    include: {
      timeSlot: true
    }
  });
  
  console.log(`📊 Total bookings cancelados con isRecycled=true: ${recycledBookings.length}\n`);
  
  if (recycledBookings.length === 0) {
    console.log('❌ NO HAY BOOKINGS RECICLADOS EN LA BASE DE DATOS');
    console.log('   Esto explica por qué no aparecen los badges.\n');
    
    // Verificar bookings cancelados SIN isRecycled
    const cancelledNoRecycled = await prisma.booking.findMany({
      where: {
        status: 'CANCELLED',
        isRecycled: false
      },
      take: 5
    });
    
    console.log(`📋 Bookings cancelados con isRecycled=false: ${cancelledNoRecycled.length}`);
    cancelledNoRecycled.forEach(b => {
      console.log(`   - ${b.id.substring(0, 20)}... TimeSlot: ${b.timeSlotId.substring(0, 20)}...`);
    });
  } else {
    console.log('✅ Bookings reciclados encontrados:');
    recycledBookings.slice(0, 10).forEach(b => {
      const date = new Date(b.timeSlot.start);
      console.log(`   - ${date.toLocaleDateString()} ${date.toLocaleTimeString()} - Pista ${b.timeSlot.courtNumber || 'N/A'}`);
      console.log(`     Booking: ${b.id.substring(0, 20)}...`);
      console.log(`     TimeSlot: ${b.timeSlotId.substring(0, 20)}...`);
    });
  }
  
  await prisma.$disconnect();
}

checkRecycledBookings();
