const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function regenerateAll() {
  console.log(' PASO 1: Verificando clases con reservas...\n');
  
  // Contar clases con y sin bookings
  const withBookings = await prisma.timeSlot.count({
    where: {
      courtId: null,
      bookings: { some: {} }
    }
  });
  
  const withoutBookings = await prisma.timeSlot.count({
    where: {
      courtId: null,
      bookings: { none: {} }
    }
  });
  
  console.log(`   Propuestas CON reservas: ${withBookings} (se mantienen)`);
  console.log(`   Propuestas SIN reservas: ${withoutBookings} (se eliminarán)\n`);
  
  console.log('  PASO 2: Eliminando solo propuestas sin reservas...\n');
  
  const deleted = await prisma.timeSlot.deleteMany({
    where: {
      courtId: null,
      bookings: { none: {} }
    }
  });
  
  console.log(` Eliminadas ${deleted.count} propuestas\n`);
  console.log(' PASO 3: Generando clases faltantes (06:00-20:30 UTC = 07:00-21:30 local)...\n');
  
  let totalCreated = 0;
  
  for (let dayOffset = 1; dayOffset <= 30; dayOffset++) {
    const response = await fetch(`http://localhost:9002/api/cron/generate-cards?targetDay=${dayOffset}`);
    const result = await response.json();
    
    if (result.created) {
      totalCreated += result.created;
      if (dayOffset % 10 === 0 || dayOffset === 1) {
        console.log(`  Día +${dayOffset}: ${result.created} nuevas clases (Total: ${totalCreated})`);
      }
    }
  }
  
  console.log(`\n COMPLETADO!`);
  console.log(`    Nuevas clases creadas: ${totalCreated}`);
  console.log(`    Clases con reservas preservadas: ${withBookings}`);
  console.log(`    Horario: 06:00-20:30 UTC (07:00-21:30 hora local España)`);
  
  await prisma.$disconnect();
}

regenerateAll().catch(console.error);
