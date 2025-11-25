const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDec3() {
  // Buscar cualquier TimeSlot que contenga "2025-12-03" en el start
  const slots = await prisma.$queryRaw`
    SELECT id, start, instructorId FROM TimeSlot
    WHERE start LIKE '%2025-12-03%'
  `;
  
  console.log('TimeSlots for Dec 3:', slots.length);
  if (slots.length > 0) {
    console.log('Examples:', slots.slice(0, 3));
  }
  
  await prisma.$disconnect();
}

checkDec3();
