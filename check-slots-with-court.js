// Script para ver qué tienen las clases con pista
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSlots() {
  try {
    console.log('🔍 Verificando clases con pista asignada...\n');

    const slots = await prisma.$queryRaw`
      SELECT id, level, category, courtNumber, start 
      FROM TimeSlot 
      WHERE courtNumber IS NOT NULL 
      AND courtNumber > 0
      LIMIT 10
    `;

    console.log(`📊 Clases con pista asignada (primeras 10):`);
    console.table(slots);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSlots();
