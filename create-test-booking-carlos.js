const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestBooking() {
  try {
    // Buscar Marc Parra
    const marc = await prisma.user.findFirst({
      where: { email: 'jugador1@padelpro.com' }
    });
    
    console.log('👤 Marc Parra:', marc.name);
    
    // Buscar una clase de Carlos Ruiz del día 26
    const carlosInstructor = await prisma.instructor.findFirst({
      where: { name: 'Carlos Ruiz' }
    });
    
    console.log('👨‍🏫 Carlos Ruiz Instructor ID:', carlosInstructor.id);
    
    // Buscar TimeSlots de Carlos Ruiz del día 26
    const date26 = new Date('2025-11-26T00:00:00.000Z');
    const date27 = new Date('2025-11-27T00:00:00.000Z');
    
    const carlosSlots = await prisma.timeSlot.findMany({
      where: {
        instructorId: carlosInstructor.id,
        start: {
          gte: date26,
          lt: date27
        }
      },
      take: 5
    });
    
    console.log(`\n📅 TimeSlots de Carlos Ruiz el 26 nov: ${carlosSlots.length}`);
    
    if (carlosSlots.length === 0) {
      console.log('❌ No hay TimeSlots de Carlos el día 26');
      return;
    }
    
    // Usar el primer slot
    const slot = carlosSlots[0];
    const startTime = new Date(Number(slot.start));
    console.log(`\n✅ Usando TimeSlot: ${slot.id.substring(0, 20)}...`);
    console.log(`   Fecha: ${startTime.toLocaleString('es-ES')}`);
    
    // Crear booking confirmado
    const booking = await prisma.booking.create({
      data: {
        id: `booking-test-${Date.now()}`,
        userId: marc.id,
        timeSlotId: slot.id,
        groupSize: 1,
        status: 'CONFIRMED',
        paidWithPoints: false,
        pointsUsed: 0,
        amountBlocked: 0,
        isRecycled: false
      }
    });
    
    console.log('\n✅ Booking creado:');
    console.log('   ID:', booking.id);
    console.log('   Status:', booking.status);
    console.log('   Usuario:', marc.name);
    console.log('   TimeSlot:', slot.id.substring(0, 20) + '...');
    console.log('   Fecha:', startTime.toLocaleString('es-ES'));
    
    console.log('\n🎉 Ahora este booking debería aparecer en el panel de Carlos Ruiz!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestBooking();
