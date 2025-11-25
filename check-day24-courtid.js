const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCourtIds() {
  try {
    const slots = await prisma.timeSlot.findMany({
      where: {
        start: new Date('2025-11-24T06:00:00.000Z')
      },
      select: {
        id: true,
        level: true,
        genderCategory: true,
        courtId: true,
        instructor: {
          select: {
            name: true
          }
        },
        bookings: {
          where: {
            status: {
              in: ['PENDING', 'CONFIRMED']
            }
          }
        }
      }
    });
    
    console.log('\n🔍 Tarjetas del día 24 a las 06:00 UTC (7:00 España):', slots.length);
    console.log('');
    
    slots.forEach(s => {
      console.log(`  ${s.instructor.name.padEnd(20)} | ${s.level.padEnd(12)} | ${s.genderCategory.padEnd(10)} | courtId: ${s.courtId ? '✅ ASIGNADO' : '❌ NULL'} | bookings: ${s.bookings.length}`);
    });
    
    const withCourtId = slots.filter(s => s.courtId !== null).length;
    const withoutCourtId = slots.filter(s => s.courtId === null).length;
    
    console.log('\n════════════════════════════════════════════════');
    console.log(`\n📊 RESUMEN:`);
    console.log(`   Con courtId asignado: ${withCourtId}`);
    console.log(`   Sin courtId (NULL): ${withoutCourtId}`);
    console.log('');
    console.log(`💡 El API solo devuelve las ${withoutCourtId} tarjetas con courtId=NULL`);
    console.log(`   Por eso en el frontend solo ves ${withoutCourtId} tarjetas`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCourtIds();
