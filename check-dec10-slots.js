const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSlots() {
  const slots = await prisma.$queryRaw`
    SELECT ts.id, ts.creditsSlots, i.name as instructorName
    FROM TimeSlot ts
    JOIN Instructor i ON ts.instructorId = i.id
    WHERE ts.start = 1733827200000
  `;
  
  console.log('📅 Clases del 10 dic 9:00:\n');
  slots.forEach(slot => {
    console.log(`👨‍🏫 ${slot.instructorName}`);
    console.log(`   ID: ${slot.id.substring(0, 15)}`);
    console.log(`   creditsSlots: ${slot.creditsSlots}`);
    const parsed = JSON.parse(slot.creditsSlots || '[]');
    console.log(`   parsed: [${parsed.join(', ')}]`);
    console.log('');
  });
  
  await prisma.$disconnect();
}

checkSlots();
