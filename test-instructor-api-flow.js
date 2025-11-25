const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('\n🔍 Testing instructor API flow:\n');
  
  // 1. User login
  const user = await prisma.user.findUnique({
    where: { email: 'instructor@padelpro.com' }
  });
  
  console.log('1️⃣ User logged in:');
  console.log('   Email:', user.email);
  console.log('   UserId:', user.id);
  console.log('   Role:', user.role);
  
  // 2. Get Instructor by userId (simulating /api/instructors/by-user/{userId})
  const instructor = await prisma.instructor.findUnique({
    where: { userId: user.id }
  });
  
  if (!instructor) {
    console.log('\n❌ ERROR: No Instructor record found for userId:', user.id);
    await prisma.$disconnect();
    return;
  }
  
  console.log('\n2️⃣ Instructor record retrieved:');
  console.log('   InstructorId:', instructor.id);
  console.log('   Name:', instructor.name);
  
  // 3. Simulate API call to /api/timeslots
  const date = '2025-11-26';
  const dateStart = new Date(`${date}T00:00:00.000Z`).getTime();
  const dateEnd = new Date(`${date}T23:59:59.999Z`).getTime();
  const clubId = 'padel-estrella-madrid';
  
  console.log('\n3️⃣ Simulating API call:');
  console.log('   GET /api/timeslots?date=' + date + '&clubId=' + clubId + '&instructorId=' + instructor.id);
  
  const timeSlots = await prisma.$queryRawUnsafe(`
    SELECT * FROM TimeSlot 
    WHERE clubId = '${clubId}'
    AND start >= ${dateStart} 
    AND start <= ${dateEnd}
    AND instructorId = '${instructor.id}'
    ORDER BY start ASC
  `);
  
  console.log('\n4️⃣ TimeSlots found:', timeSlots.length);
  
  if (timeSlots.length > 0) {
    // Get TimeSlot IDs
    const timeSlotIds = timeSlots.map(slot => slot.id);
    
    // Get bookings
    const bookings = await prisma.booking.findMany({
      where: {
        timeSlotId: { in: timeSlotIds },
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
    
    console.log('\n5️⃣ CONFIRMED Bookings found:', bookings.length);
    
    if (bookings.length > 0) {
      console.log('\n📋 First booking:');
      console.log('   ID:', bookings[0].id);
      console.log('   TimeSlotId:', bookings[0].timeSlotId);
      console.log('   User:', bookings[0].user.name);
      console.log('   Status:', bookings[0].status);
      
      // Check if this booking's timeSlot is in our list
      const belongsToInstructor = timeSlots.some(slot => slot.id === bookings[0].timeSlotId);
      console.log('   ✅ Belongs to instructor:', belongsToInstructor);
    }
    
    // Count slots with bookings
    const slotsWithBookings = timeSlots.filter(slot => 
      bookings.some(booking => booking.timeSlotId === slot.id)
    );
    
    console.log('\n6️⃣ TimeSlots with CONFIRMED bookings:', slotsWithBookings.length);
    
    if (slotsWithBookings.length > 0) {
      console.log('\n✅ SHOULD DISPLAY:', slotsWithBookings.length, 'classes');
    } else {
      console.log('\n❌ NO classes would be displayed (no confirmed bookings)');
    }
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);
