const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDay24Complete() {
  console.log('🔍 TODAS LAS TARJETAS DEL DÍA 24 DE NOVIEMBRE\n');
  
  const startOfDay = new Date('2025-11-24T00:00:00Z').getTime();
  const endOfDay = new Date('2025-11-25T00:00:00Z').getTime();
  
  const allSlots = await prisma.$queryRawUnsafe(`
    SELECT ts.*, i.name as instructorName,
           (SELECT COUNT(*) FROM Booking WHERE timeSlotId = ts.id AND status != 'CANCELLED') as bookingCount
    FROM TimeSlot ts
    JOIN Instructor i ON ts.instructorId = i.id
    WHERE ts.start >= ${startOfDay} AND ts.start < ${endOfDay}
    ORDER BY ts.start, i.name, ts.level DESC
  `);
  
  console.log(`📊 Total tarjetas del día 24: ${allSlots.length}\n`);
  
  // Agrupar por instructor + hora
  const grouped = {};
  
  allSlots.forEach(s => {
    const date = new Date(Number(s.start));
    const hour = date.getUTCHours();
    const minute = date.getUTCMinutes();
    const timeLabel = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} UTC`;
    const key = `${s.instructorName} - ${timeLabel}`;
    
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(s);
  });
  
  console.log('📋 AGRUPADAS POR INSTRUCTOR Y HORA:\n');
  
  let duplicatesFound = 0;
  let totalGroups = 0;
  
  Object.entries(grouped).forEach(([key, slots]) => {
    totalGroups++;
    const hasMultiple = slots.length > 1;
    const icon = hasMultiple ? '✅' : '⚠️';
    
    console.log(`${icon} ${key}: ${slots.length} tarjeta(s)`);
    
    slots.forEach(s => {
      const courtInfo = s.courtNumber ? `Pista ${s.courtNumber}` : 'Sin pista';
      console.log(`   • ${s.level.padEnd(12)} | ${(s.genderCategory || 'mixto').padEnd(10)} | ${courtInfo} | ${s.bookingCount} reservas`);
    });
    
    if (hasMultiple) {
      duplicatesFound++;
      const hasClassified = slots.some(sl => sl.level !== 'ABIERTO');
      const hasDuplicate = slots.some(sl => sl.level === 'ABIERTO' && sl.genderCategory === 'mixto');
      
      if (hasClassified && hasDuplicate) {
        console.log(`   ✅ Correcto: Clasificada + duplicada`);
      } else {
        console.log(`   ⚠️ Raro: Múltiples tarjetas pero estructura incorrecta`);
      }
    }
    
    console.log();
  });
  
  console.log('═'.repeat(60));
  console.log(`\n📊 RESUMEN:`);
  console.log(`   Total grupos (instructor+hora): ${totalGroups}`);
  console.log(`   Grupos con duplicadas: ${duplicatesFound}`);
  console.log(`   Grupos sin duplicadas: ${totalGroups - duplicatesFound}\n`);
  
  if (duplicatesFound > 0) {
    console.log(`✅ El backend SÍ tiene tarjetas duplicadas (${duplicatesFound} encontradas)`);
    console.log(`   Si no las ves en el frontend, es un problema de caché o filtrado\n`);
  } else {
    console.log(`❌ No se encontraron tarjetas duplicadas en el backend\n`);
  }
  
  // Mostrar específicamente Carlos Martinez 06:00 UTC
  console.log('🎯 ESPECÍFICAMENTE: Carlos Martinez a las 06:00 UTC (7:00 España):\n');
  
  const carlos06 = allSlots.filter(s => {
    const date = new Date(Number(s.start));
    return s.instructorName.includes('Carlos') && 
           date.getUTCHours() === 6 && 
           date.getUTCMinutes() === 0;
  });
  
  if (carlos06.length > 0) {
    console.log(`   Encontradas: ${carlos06.length} tarjeta(s)`);
    carlos06.forEach(s => {
      console.log(`   • ${s.level}/${s.genderCategory} - ${s.bookingCount} reservas - ID: ${s.id.substring(0, 20)}...`);
    });
  } else {
    console.log(`   ⚠️ No se encontraron tarjetas de Carlos a las 06:00 UTC`);
  }
  
  prisma.$disconnect();
}

checkDay24Complete();
