const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function finalVerify() {
  // Verificar resumen final
  const summary = await prisma.$queryRaw`
    SELECT 
      MIN(strftime('%H:%M', start)) as primera_hora_utc,
      MAX(strftime('%H:%M', start)) as ultima_hora_utc,
      COUNT(*) as total_clases
    FROM TimeSlot
    WHERE courtId IS NULL
  `;
  
  const firstUTC = summary[0].primera_hora_utc;
  const lastUTC = summary[0].ultima_hora_utc;
  const firstLocal = (parseInt(firstUTC.split(':')[0]) + 1) + ':' + firstUTC.split(':')[1];
  const lastLocal = (parseInt(lastUTC.split(':')[0]) + 1) + ':' + lastUTC.split(':')[1];
  
  console.log('===  VERIFICACIÓN FINAL ===\n');
  console.log(`Total propuestas: ${summary[0].total_clases}`);
  console.log(`\nHorario UTC: ${firstUTC} - ${lastUTC}`);
  console.log(`Horario local España: ${firstLocal} - ${lastLocal}\n`);
  
  // Verificar que NO haya clases fuera de horario
  const outOfRange = await prisma.$queryRaw`
    SELECT COUNT(*) as count
    FROM TimeSlot
    WHERE courtId IS NULL
    AND (time(start) < '06:00:00' OR time(start) > '20:30:00')
  `;
  
  if (outOfRange[0].count === 0) {
    console.log(' PERFECTO: Todas las clases están dentro del horario correcto');
    console.log('   07:00 - 21:30 hora local España');
    console.log('\n PRÓXIMOS PASOS:');
    console.log('   1. Hacer hard refresh en el navegador (Ctrl+Shift+R)');
    console.log('   2. Verificar que los bloques de 22:00 y 22:30 ya no aparezcan');
  } else {
    console.log(`  Aún hay ${outOfRange[0].count} clases fuera de horario`);
  }
  
  await prisma.$disconnect();
}

finalVerify();
