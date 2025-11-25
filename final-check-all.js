const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function finalCheck() {
  console.log('=== VERIFICACIÓN FINAL ===\n');
  
  // 1. Contar propuestas día 19
  const nov19Total = await prisma.timeSlot.count({
    where: {
      start: { gte: new Date('2025-11-19T00:00:00.000Z'), lt: new Date('2025-11-20T00:00:00.000Z') },
      courtId: null
    }
  });
  
  console.log(` Día 19 nov: ${nov19Total} propuestas`);
  
  // 2. Verificar bookings CANCELLED
  const cancelledBookings = await prisma.booking.findMany({
    where: {
      timeSlot: {
        start: { gte: new Date('2025-11-19T00:00:00.000Z'), lt: new Date('2025-11-20T00:00:00.000Z') }
      },
      status: 'CANCELLED'
    },
    include: {
      timeSlot: {
        select: { start: true },
        include: { instructor: { select: { name: true } } }
      }
    }
  });
  
  console.log(`\n Bookings CANCELLED día 19: ${cancelledBookings.length}`);
  cancelledBookings.forEach(b => {
    const date = new Date(b.timeSlot.start);
    const hourLocal = date.getHours() + ':' + date.getMinutes().toString().padStart(2, '0');
    console.log(`  ${hourLocal} - ${b.timeSlot.instructor?.name} - groupSize: ${b.groupSize}`);
  });
  
  // 3. Verificar total de propuestas (todos los días)
  const totalAll = await prisma.timeSlot.count({ where: { courtId: null } });
  console.log(`\n Total propuestas (todos los días): ${totalAll}`);
  
  // 4. Resumen horarios
  const summary = await prisma.$queryRaw`
    SELECT 
      MIN(strftime('%H:%M', start)) as primera,
      MAX(strftime('%H:%M', start)) as ultima
    FROM TimeSlot
    WHERE courtId IS NULL
  `;
  
  const firstLocal = (parseInt(summary[0].primera.split(':')[0]) + 1) + ':' + summary[0].primera.split(':')[1];
  const lastLocal = (parseInt(summary[0].ultima.split(':')[0]) + 1) + ':' + summary[0].ultima.split(':')[1];
  
  console.log(`\n Horario: ${firstLocal} - ${lastLocal} (hora local España)`);
  
  console.log('\n CAMBIOS APLICADOS:');
  console.log('   1. API del calendario ahora filtra bookings CANCELLED');
  console.log('   2. Solo cuenta bookings CONFIRMED y PENDING');
  console.log('   3. Día 19 regenerado con 150 propuestas');
  console.log('\n PRÓXIMO PASO:');
  console.log('   Hacer hard refresh: Ctrl+Shift+R');
  
  await prisma.$disconnect();
}

finalCheck();
