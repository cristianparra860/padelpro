const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function finalCheck() {
  // Buscar TODAS las clases fuera de horario (después 20:30 UTC = 21:30 local)
  const lateClasses = await prisma.$queryRaw`
    SELECT 
      date(start) as fecha,
      strftime('%H:%M', start) as hora_utc,
      COUNT(*) as cantidad
    FROM TimeSlot
    WHERE courtId IS NULL
    AND time(start) > '20:30:00'
    GROUP BY date(start), strftime('%H:%M', start)
    ORDER BY fecha, hora_utc
  `;
  
  console.log('=== CLASES DESPUÉS DE 20:30 UTC (21:30 local) ===\n');
  
  if (lateClasses.length === 0) {
    console.log(' PERFECTO: No hay clases fuera de horario');
    console.log('   Todas las clases terminan a las 20:30 UTC (21:30 hora local)\n');
  } else {
    console.log(`  PROBLEMA: ${lateClasses.length} slots fuera de horario:\n`);
    lateClasses.forEach(row => {
      console.log(`  ${row.fecha} ${row.hora_utc} UTC: ${row.cantidad} clases`);
    });
  }
  
  // Verificar horarios correctos
  const summary = await prisma.$queryRaw`
    SELECT 
      MIN(strftime('%H:%M', start)) as primera_hora,
      MAX(strftime('%H:%M', start)) as ultima_hora,
      COUNT(*) as total_clases
    FROM TimeSlot
    WHERE courtId IS NULL
  `;
  
  console.log('\n=== RESUMEN HORARIOS ===');
  console.log(`Primera hora: ${summary[0].primera_hora} UTC (${parseInt(summary[0].primera_hora.split(':')[0]) + 1}:${summary[0].primera_hora.split(':')[1]} local)`);
  console.log(`Última hora: ${summary[0].ultima_hora} UTC (${parseInt(summary[0].ultima_hora.split(':')[0]) + 1}:${summary[0].ultima_hora.split(':')[1]} local)`);
  console.log(`Total propuestas: ${summary[0].total_clases}`);
  
  await prisma.$disconnect();
}

finalCheck();
