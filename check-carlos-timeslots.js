const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCarlosTimeslots() {
  try {
    // Buscar Carlos Ruiz
    const carlos = await prisma.user.findFirst({
      where: { email: 'instructor@padelpro.com' }
    });
    
    console.log('👨‍🏫 Carlos Ruiz:', {
      id: carlos.id,
      name: carlos.name,
      role: carlos.role
    });
    
    // Buscar TimeSlots asignados a Carlos
    const timeslots = await prisma.timeSlot.findMany({
      where: { instructorId: carlos.id },
      take: 10
    });
    
    console.log(`\n📅 TimeSlots asignados a Carlos: ${timeslots.length}`);
    
    if (timeslots.length === 0) {
      console.log('❌ Carlos NO tiene TimeSlots asignados todavía');
    } else {
      console.log('\n✅ Ejemplos de TimeSlots:');
      for (const slot of timeslots.slice(0, 3)) {
        const startDate = new Date(Number(slot.start));
        const bookings = await prisma.booking.findMany({
          where: { 
            timeSlotId: slot.id,
            status: 'CONFIRMED'
          }
        });
        
        console.log(`\n  📌 Slot: ${slot.id.substring(0, 15)}...`);
        console.log(`     Fecha: ${startDate.toLocaleString('es-ES')}`);
        console.log(`     Instructor: ${slot.instructorName}`);
        console.log(`     Bookings confirmados: ${bookings.length}`);
      }
    }
    
    // Verificar si existe en tabla Instructor
    const instructor = await prisma.instructor.findFirst({
      where: { userId: carlos.id }
    });
    
    console.log(`\n👨‍🏫 Registro en tabla Instructor: ${instructor ? '✅ SÍ' : '❌ NO'}`);
    if (instructor) {
      console.log(`   ID: ${instructor.id}`);
      console.log(`   Nombre: ${instructor.name}`);
      console.log(`   Club: ${instructor.clubId}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkCarlosTimeslots();
