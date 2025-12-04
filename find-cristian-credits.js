const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findCristianClasses() {
  const slots = await prisma.$queryRaw`
    SELECT ts.id, ts.start, ts.creditsSlots, ts.creditsCost, i.name as instructorName
    FROM TimeSlot ts
    JOIN Instructor i ON ts.instructorId = i.id
    WHERE i.name = 'Cristian Parra'
    AND ts.creditsSlots != '[]'
    ORDER BY ts.start
    LIMIT 5
  `;
  
  console.log(`\n📚 Clases de Cristian Parra con creditsSlots activados:\n`);
  
  slots.forEach(slot => {
    const date = new Date(Number(slot.start));
    console.log(`📅 ${date.toLocaleDateString('es-ES')} ${date.toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'})}`);
    console.log(`   ID: ${slot.id.substring(0, 15)}`);
    console.log(`   creditsSlots (raw): ${slot.creditsSlots}`);
    const parsed = JSON.parse(slot.creditsSlots || '[]');
    console.log(`   creditsSlots (parsed): [${parsed.join(', ')}]`);
    console.log(`   creditsCost: ${slot.creditsCost}`);
    console.log('');
  });
  
  await prisma.$disconnect();
}

findCristianClasses();
