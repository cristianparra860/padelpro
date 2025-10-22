const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testQuery() {
  console.log('\n🔍 Testing calendar query...\n');
  
  const startDate = '2025-09-30T22:00:00.000Z';
  const endDate = '2025-10-31T22:59:59.999Z';
  
  console.log('Searching with:');
  console.log('  Start:', startDate);
  console.log('  End:', endDate);
  
  const classes = await prisma.timeSlot.findMany({
    where: {
      start: { 
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    },
    select: {
      id: true,
      start: true
    },
    take: 5,
    orderBy: { start: 'asc' }
  });
  
  console.log(`\nFound: ${classes.length} classes`);
  
  if (classes.length > 0) {
    console.log('\nFirst 5 classes:');
    classes.forEach(c => {
      console.log(`  - ${c.start.toISOString()} (${c.id.substring(0, 20)}...)`);
    });
  } else {
    // Buscar cualquier clase
    const any = await prisma.timeSlot.findMany({
      select: { start: true },
      take: 3,
      orderBy: { start: 'asc' }
    });
    console.log('\nPrimeras 3 clases en toda la DB:');
    any.forEach(c => console.log(`  - ${c.start.toISOString()}`));
  }
  
  await prisma.$disconnect();
}

testQuery();
