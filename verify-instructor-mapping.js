const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('\n🔍 Verificando mapeo User → Instructor:\n');
  
  const user = await prisma.user.findUnique({
    where: { email: 'instructor@padelpro.com' }
  });
  
  console.log('👤 User (Carlos Ruiz):');
  console.log('   ID:', user.id);
  console.log('   Email:', user.email);
  console.log('   Role:', user.role);
  
  const instructor = await prisma.instructor.findUnique({
    where: { userId: user.id }
  });
  
  if (instructor) {
    console.log('\n👨‍🏫 Instructor record:');
    console.log('   ID:', instructor.id);
    console.log('   Name:', instructor.name);
    console.log('   UserId:', instructor.userId);
    
    const timeSlotsCount = await prisma.timeSlot.count({
      where: { 
        instructorId: instructor.id,
        clubId: 'padel-estrella-madrid'
      }
    });
    
    console.log('\n📅 TimeSlots asignados a instructor.id:', timeSlotsCount);
    
    const bookingsCount = await prisma.booking.count({
      where: {
        timeSlot: {
          instructorId: instructor.id,
          clubId: 'padel-estrella-madrid'
        },
        status: 'CONFIRMED'
      }
    });
    
    console.log('📋 Bookings CONFIRMED en esos TimeSlots:', bookingsCount);
  } else {
    console.log('\n❌ NO hay registro Instructor para este User');
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);
