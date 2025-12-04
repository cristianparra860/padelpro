const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkInstructorRanges() {
  try {
    const instructors = await prisma.$queryRaw`
      SELECT id, name, levelRanges 
      FROM Instructor 
      LIMIT 10
    `;
    
    console.log('👨‍🏫 Instructores y sus rangos de nivel:\n');
    
    instructors.forEach(i => {
      console.log(`- ${i.name}:`);
      if (i.levelRanges) {
        try {
          const ranges = JSON.parse(i.levelRanges);
          ranges.forEach(r => {
            console.log(`  • ${r.minLevel} - ${r.maxLevel}`);
          });
        } catch (e) {
          console.log(`  ⚠️ Error parseando: ${i.levelRanges}`);
        }
      } else {
        console.log(`  ❌ SIN RANGOS CONFIGURADOS`);
      }
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkInstructorRanges();
