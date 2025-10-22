const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDateFormat() {
  try {
    const result = await prisma.$queryRaw`
      SELECT 
        id,
        start,
        typeof(start) as start_type,
        CAST(start AS TEXT) as start_text
      FROM TimeSlot
      LIMIT 1
    `;
    
    console.log('\n🔍 Formato de columna "start":\n');
    console.log('Tipo:', result[0].start_type);
    console.log('Valor raw:', result[0].start);
    console.log('Valor como texto:', result[0].start_text);
    
    // Test timestamp comparison
    const date = '2025-10-18';
    const startOfDay = new Date(`${date}T00:00:00`).getTime();
    const endOfDay = new Date(`${date}T23:59:59`).getTime();
    
    console.log('\n🔢 Comparación con timestamps:');
    console.log('startOfDay:', startOfDay);
    console.log('endOfDay:', endOfDay);
    
    const testTimestamp = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM TimeSlot
      WHERE start >= ${startOfDay} AND start <= ${endOfDay}
    `;
    
    console.log('Resultado con timestamp:', testTimestamp[0].count);
    
    // Test string comparison
    const testString = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM TimeSlot
      WHERE date(start) = '2025-10-18'
    `;
    
    console.log('Resultado con date(start):', testString[0].count);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDateFormat();
