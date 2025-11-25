// Verificar la tarjeta problemática
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkProblematic() {
  try {
    const timeSlotId = 'ts_1763530282757_uqmtikv2h'; // La problemática del diagnóstico
    
    console.log('\n🔍 Analizando tarjeta problemática:', timeSlotId, '\n');
    
    // Obtener info de la tarjeta
    const slot = await prisma.timeSlot.findUnique({
      where: { id: timeSlotId }
    });
    
    console.log('📋 TimeSlot info:');
    console.log('   ID:', slot.id);
    console.log('   Level:', slot.level);
    console.log('   GenderCategory:', slot.genderCategory);
    console.log('   Horario:', slot.start);
    console.log('   Instructor:', slot.instructorId);
    console.log('   Court:', slot.courtId);
    
    // Obtener bookings de esta tarjeta
    const bookings = await prisma.booking.findMany({
      where: { 
        timeSlotId: timeSlotId,
        status: { in: ['PENDING', 'CONFIRMED'] }
      },
      include: {
        user: {
          select: { name: true, level: true, gender: true }
        }
      }
    });
    
    console.log('\n📚 Bookings de esta tarjeta:', bookings.length);
    bookings.forEach((b, i) => {
      console.log(`\n   Booking ${i + 1}:`);
      console.log('   - User:', b.user.name);
      console.log('   - User level:', b.user.level);
      console.log('   - User gender:', b.user.gender);
      console.log('   - GroupSize:', b.groupSize);
      console.log('   - Status:', b.status);
      console.log('   - Created:', b.createdAt);
    });
    
    // Buscar otras tarjetas del mismo instructor/hora
    console.log('\n\n🔍 Buscando otras tarjetas del mismo instructor/hora...');
    const sameTimeSlots = await prisma.timeSlot.findMany({
      where: {
        instructorId: slot.instructorId,
        start: slot.start,
        courtId: null
      }
    });
    
    console.log(`\n📋 Tarjetas encontradas: ${sameTimeSlots.length}`);
    sameTimeSlots.forEach((s, i) => {
      console.log(`\n   Tarjeta ${i + 1}:`);
      console.log('   - ID:', s.id.substring(0, 25) + '...');
      console.log('   - Level:', s.level);
      console.log('   - GenderCategory:', s.genderCategory);
    });
    
    await prisma.$disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error);
    await prisma.$disconnect();
  }
}

checkProblematic();
