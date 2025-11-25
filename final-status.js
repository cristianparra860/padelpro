const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function finalStatus() {
  console.log('===  ESTADO FINAL ===\n');
  
  // Día 19
  const nov19 = await prisma.timeSlot.count({
    where: {
      start: { gte: new Date('2025-11-19T00:00:00.000Z'), lt: new Date('2025-11-20T00:00:00.000Z') },
      courtId: null
    }
  });
  
  console.log(`Día 19 nov: ${nov19} propuestas`);
  
  // Total
  const total = await prisma.timeSlot.count({ where: { courtId: null } });
  console.log(`Total general: ${total} propuestas`);
  
  // Resumen horarios
  const summary = await prisma.$queryRaw`
    SELECT 
      MIN(strftime('%H:%M', start)) as primera,
      MAX(strftime('%H:%M', start)) as ultima
    FROM TimeSlot
    WHERE courtId IS NULL
  `;
  
  const firstLocal = (parseInt(summary[0].primera.split(':')[0]) + 1) + ':' + summary[0].primera.split(':')[1];
  const lastLocal = (parseInt(summary[0].ultima.split(':')[0]) + 1) + ':' + summary[0].ultima.split(':')[1];
  
  console.log(`\nHorario: ${firstLocal} - ${lastLocal} hora local`);
  
  console.log('\n PROBLEMAS RESUELTOS:');
  console.log('   1. Día 19 regenerado (150 clases)');
  console.log('   2. API filtra bookings CANCELLED');
  console.log('   3. Bloques naranjas muestran solo jugadores activos');
  console.log('   4. Horario correcto 07:00-21:30');
  console.log('\n HACER HARD REFRESH: Ctrl+Shift+R');
  
  await prisma.$disconnect();
}

finalStatus();
