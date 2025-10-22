const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const total = await prisma.timeSlot.count();
  console.log(`\nTotal clases en DB: ${total}`);
  
  if (total > 0) {
    const first = await prisma.timeSlot.findFirst({ orderBy: { start: 'asc' } });
    const last = await prisma.timeSlot.findFirst({ orderBy: { start: 'desc' } });
    
    console.log(`Primera clase: ${first.start.toISOString()}`);
    console.log(`Última clase: ${last.start.toISOString()}`);
    
    // Contar en noviembre
    const novCount = await prisma.timeSlot.count({
      where: {
        start: {
          gte: new Date('2025-11-01T00:00:00Z'),
          lte: new Date('2025-11-30T23:59:59Z')
        }
      }
    });
    console.log(`Clases en noviembre 2025: ${novCount}\n`);
  }
  
  await prisma.$disconnect();
}

main();
