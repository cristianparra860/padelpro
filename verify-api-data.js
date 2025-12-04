const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyAPIData() {
  try {
    const dec6_13h = new Date('2025-12-06T13:00:00.000Z').getTime();
    
    console.log('🔍 Verificando datos que devuelve el API para el 6 de diciembre a las 13:00\n');
    
    const slots = await prisma.$queryRaw`
      SELECT 
        ts.id,
        ts.level,
        ts.levelRange,
        ts.genderCategory,
        i.name as instructorName
      FROM TimeSlot ts
      LEFT JOIN Instructor i ON ts.instructorId = i.id
      WHERE ts.start = ${dec6_13h}
      ORDER BY i.name
    `;
    
    console.log(`📊 Clases encontradas: ${slots.length}\n`);
    
    slots.forEach((s, i) => {
      console.log(`${i + 1}. ${s.instructorName || 'Sin instructor'}`);
      console.log(`   Level: "${s.level}"`);
      console.log(`   LevelRange: "${s.levelRange || 'NULL'}"`);
      console.log(`   Género: ${s.genderCategory || 'NULL'}`);
      
      // Verificar si está correcto
      const isIndividual = /^\d+\.\d+$/.test(s.level);
      if (isIndividual) {
        console.log(`   ❌ PROBLEMA: Aún muestra nivel individual`);
      } else if (s.level === '5-7' || /^\d+-\d+$/.test(s.level)) {
        console.log(`   ✅ CORRECTO: Muestra rango`);
      } else if (s.level === 'ABIERTO' || s.level === 'abierto') {
        console.log(`   ✅ CORRECTO: Abierto`);
      }
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyAPIData();
