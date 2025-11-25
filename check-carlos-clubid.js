const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkClubIds() {
  try {
    const slots = await prisma.timeSlot.findMany({
      where: {
        start: new Date('2025-11-24T06:00:00.000Z'),
        instructor: {
          name: 'Carlos Martinez'
        }
      },
      select: {
        id: true,
        clubId: true,
        level: true,
        genderCategory: true,
        courtId: true
      }
    });
    
    console.log('\n🎯 Tarjetas de Carlos Martinez a las 7:00 (06:00 UTC):', slots.length);
    console.log('');
    
    slots.forEach(s => {
      console.log(`ID: ${s.id.substring(0, 15)}...`);
      console.log(`  clubId: ${s.clubId}`);
      console.log(`  level: ${s.level}`);
      console.log(`  genderCategory: ${s.genderCategory}`);
      console.log(`  courtId: ${s.courtId ? '✅ ASIGNADO' : '❌ NULL'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkClubIds();
