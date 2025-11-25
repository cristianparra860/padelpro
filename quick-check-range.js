/**
 * Debug: Check TimeSlot range
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRange() {
  const result = await prisma.$queryRaw`
    SELECT MIN(start) as minStart, MAX(start) as maxStart, COUNT(*) as total
    FROM TimeSlot 
    WHERE clubId = 'padel-estrella-madrid'
  `;

  // Convertir BigInt a Number de forma segura
  const minVal = typeof result[0].minStart === 'bigint' ? Number(result[0].minStart) : result[0].minStart;
  const maxVal = typeof result[0].maxStart === 'bigint' ? Number(result[0].maxStart) : result[0].maxStart;
  
  const min = new Date(minVal);
  const max = new Date(maxVal);
  const total = Number(result[0].total);

  console.log('📅 Rango de TimeSlots:');
  console.log(`   Desde: ${min.toLocaleDateString('es-ES')}`);
  console.log(`   Hasta: ${max.toLocaleDateString('es-ES')}`);
  console.log(`   Total: ${total} slots`);
  
  const today = new Date();
  const diffDays = Math.ceil((max - today) / (1000 * 60 * 60 * 24));
  console.log(`   📊 Días de cobertura desde hoy: ${diffDays} días`);

  if (diffDays < 7) {
    console.log('\n⚠️ PROBLEMA: Solo hay cobertura para menos de 7 días');
    console.log('   El generador automático debería crear 7 días adelante');
  }

  await prisma.$disconnect();
}

checkRange();
