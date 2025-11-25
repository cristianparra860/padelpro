const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDateStorage() {
  try {
    // Obtener 3 slots del día 24 a las 06:00 UTC
    const slots = await prisma.$queryRawUnsafe(`
      SELECT id, start, end, level, genderCategory, courtId
      FROM TimeSlot 
      WHERE start >= '2025-11-24T06:00:00.000Z' 
        AND start < '2025-11-24T07:00:00.000Z'
      LIMIT 6
    `);
    
    console.log('📊 Slots encontrados:', slots.length);
    console.log('');
    
    if (slots.length > 0) {
      console.log('📅 Formato de almacenamiento en SQLite:');
      slots.forEach((s, i) => {
        console.log(`\nSlot ${i + 1}:`);
        console.log('  start value:', s.start);
        console.log('  start type:', typeof s.start);
        console.log('  start constructor:', s.start?.constructor?.name);
        if (s.start instanceof Date) {
          console.log('  start.toISOString():', s.start.toISOString());
          console.log('  start.getUTCHours():', s.start.getUTCHours());
        }
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDateStorage();
