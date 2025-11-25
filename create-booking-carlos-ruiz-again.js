const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createBooking() {
  console.log('🎾 Creating test booking for Carlos Ruiz class...\n');
  
  // 1. Get Alex García's userId
  const marc = await prisma.user.findFirst({
    where: { email: 'alex.garcia@padelpro.com' }
  });
  
  if (!marc) {
    console.log('❌ Alex García not found');
    await prisma.$disconnect();
    return;
  }
  
  console.log('✅ Alex García found:', marc.id, marc.name);
  
  // 2. Get Carlos Ruiz's first TimeSlot on Nov 26
  const timeSlot = await prisma.timeSlot.findFirst({
    where: {
      instructorId: 'instructor-carlos-ruiz',
      start: {
        gte: new Date('2025-11-26T00:00:00.000Z'),
        lt: new Date('2025-11-27T00:00:00.000Z')
      }
    },
    orderBy: {
      start: 'asc'
    }
  });
  
  if (!timeSlot) {
    console.log('❌ No TimeSlots found for Carlos Ruiz on Nov 26');
    await prisma.$disconnect();
    return;
  }
  
  console.log('✅ TimeSlot found:', timeSlot.id, new Date(timeSlot.start).toLocaleString());
  
  // 3. Check if booking already exists
  const existing = await prisma.booking.findFirst({
    where: {
      userId: marc.id,
      timeSlotId: timeSlot.id
    }
  });
  
  if (existing) {
    console.log('⚠️ Booking already exists:', existing.id, 'Status:', existing.status);
  } else {
    // 4. Create booking
    const booking = await prisma.booking.create({
      data: {
        id: `booking-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
        userId: marc.id,
        timeSlotId: timeSlot.id,
        groupSize: 1,
        status: 'CONFIRMED',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    
    console.log('✅ Booking created:', booking.id);
  }
  
  // 5. Verify
  const allBookings = await prisma.booking.findMany({
    where: {
      timeSlotId: timeSlot.id,
      status: 'CONFIRMED'
    },
    include: {
      user: {
        select: {
          name: true
        }
      }
    }
  });
  
  console.log('\n📋 Total CONFIRMED bookings for this TimeSlot:', allBookings.length);
  allBookings.forEach(b => {
    console.log(`  - ${b.user.name} (${b.status})`);
  });
  
  await prisma.$disconnect();
}

createBooking();
