const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testApiLevelData() {
  try {
    console.log('🔍 Testing API level data for Cristian Parra classes...\n');

    // Get Cristian Parra instructor
    const instructor = await prisma.instructor.findFirst({
      where: { name: { contains: 'Cristian' } }
    });

    if (!instructor) {
      console.log('❌ Instructor Cristian Parra not found');
      return;
    }

    console.log('✅ Found instructor:', instructor.name);
    console.log('📊 Level ranges:', instructor.levelRanges);

    // Get TimeSlots for this instructor with bookings
    const slots = await prisma.timeSlot.findMany({
      where: {
        instructorId: instructor.id,
        bookings: {
          some: {
            status: { in: ['PENDING', 'CONFIRMED'] }
          }
        }
      },
      include: {
        bookings: {
          where: {
            status: { in: ['PENDING', 'CONFIRMED'] }
          },
          include: {
            user: {
              select: {
                name: true,
                level: true
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      },
      take: 5
    });

    console.log(`\n📋 Found ${slots.length} classes with bookings:\n`);

    slots.forEach((slot, i) => {
      const startDate = new Date(Number(slot.start));
      const firstBooking = slot.bookings[0];
      
      console.log(`${i + 1}. Clase del ${startDate.toLocaleString('es-ES')}`);
      console.log(`   📌 ID: ${slot.id}`);
      console.log(`   🎯 level: "${slot.level}"`);
      console.log(`   📊 levelRange: "${slot.levelRange}"`);
      console.log(`   🏆 category: "${slot.category}"`);
      console.log(`   🚹 genderCategory: "${slot.genderCategory}"`);
      console.log(`   👥 Inscripciones: ${slot.bookings.length}`);
      if (firstBooking) {
        console.log(`   👤 Primer usuario: ${firstBooking.user.name} (nivel ${firstBooking.user.level})`);
      }
      console.log('');
    });

    // Now simulate what the API would return
    console.log('🌐 Simulating API response format:\n');
    
    const apiFormattedSlot = slots[0];
    if (apiFormattedSlot) {
      const apiResponse = {
        id: apiFormattedSlot.id,
        level: apiFormattedSlot.level,
        levelRange: apiFormattedSlot.levelRange,
        category: apiFormattedSlot.category,
        genderCategory: apiFormattedSlot.genderCategory,
        instructorName: instructor.name,
        bookings: apiFormattedSlot.bookings.map(b => ({
          userName: b.user.name,
          userLevel: b.user.level
        }))
      };
      
      console.log('API would return:');
      console.log(JSON.stringify(apiResponse, null, 2));
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testApiLevelData();
