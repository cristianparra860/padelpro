const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('\n🔍 Debugging instructor endpoint data:\n');
  
  // 1. Buscar el User Carlos Ruiz
  const user = await prisma.user.findUnique({
    where: { email: 'instructor@padelpro.com' }
  });
  
  console.log('1️⃣ User Carlos Ruiz:');
  console.log('   ID:', user.id);
  
  // 2. Buscar el registro Instructor
  const instructor = await prisma.instructor.findUnique({
    where: { userId: user.id }
  });
  
  console.log('\n2️⃣ Instructor record:');
  console.log('   ID:', instructor.id);
  
  // 3. Buscar TimeSlots con ese instructorId el día 26
  const dateStart = new Date('2025-11-26T00:00:00.000Z').getTime();
  const dateEnd = new Date('2025-11-26T23:59:59.999Z').getTime();
  
  const timeSlots = await prisma.$queryRawUnsafe(`
    SELECT * FROM TimeSlot 
    WHERE clubId = 'padel-estrella-madrid'
    AND start >= ${dateStart} 
    AND start <= ${dateEnd}
    AND instructorId = '${instructor.id}'
    ORDER BY start ASC
  `);
  
  console.log('\n3️⃣ TimeSlots del 26 de nov con instructorId:', instructor.id);
  console.log('   Total:', timeSlots.length);
  
  if (timeSlots.length > 0) {
    console.log('\n📅 Primer TimeSlot:');
    console.log('   ID:', timeSlots[0].id);
    console.log('   Start:', new Date(timeSlots[0].start).toLocaleString());
    console.log('   InstructorId:', timeSlots[0].instructorId);
    
    // 4. Buscar bookings de ese TimeSlot
    const bookings = await prisma.booking.findMany({
      where: {
        timeSlotId: timeSlots[0].id,
        status: 'CONFIRMED'
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });
    
    console.log('\n4️⃣ Bookings CONFIRMED en ese TimeSlot:');
    console.log('   Total:', bookings.length);
    
    if (bookings.length > 0) {
      console.log('\n📋 Primera booking:');
      console.log('   ID:', bookings[0].id);
      console.log('   User:', bookings[0].user.name);
      console.log('   Status:', bookings[0].status);
    }
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);
