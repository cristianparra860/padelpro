const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function regenerateAll() {
  console.log('  PASO 1: Eliminando todas las propuestas no confirmadas...\n');
  
  const deleted = await prisma.timeSlot.deleteMany({
    where: { courtId: null }
  });
  
  console.log(` Eliminadas ${deleted.count} propuestas\n`);
  console.log(' PASO 2: Regenerando 30 días (06:00-20:30 UTC = 07:00-21:30 hora local España)...\n');
  
  let totalCreated = 0;
  const errors = [];
  
  for (let dayOffset = 1; dayOffset <= 30; dayOffset++) {
    try {
      const response = await fetch(`http://localhost:9002/api/cron/generate-cards?targetDay=${dayOffset}`);
      const result = await response.json();
      
      if (result.created) {
        totalCreated += result.created;
        if (dayOffset % 5 === 0 || dayOffset === 1) {
          console.log(`  Día +${dayOffset}: ${result.created} clases creadas (Total acumulado: ${totalCreated})`);
        }
      } else if (result.error) {
        errors.push(`Día ${dayOffset}: ${result.error}`);
      }
    } catch (error) {
      errors.push(`Día ${dayOffset}: ${error.message}`);
    }
  }
  
  console.log(`\n COMPLETADO!`);
  console.log(`    Total clases creadas: ${totalCreated}`);
  console.log(`    Días regenerados: 30`);
  console.log(`    Horario: 06:00-20:30 UTC (07:00-21:30 hora local España)`);
  
  if (errors.length > 0) {
    console.log(`\n  Errores encontrados: ${errors.length}`);
    errors.forEach(e => console.log(`   - ${e}`));
  }
  
  await prisma.$disconnect();
}

regenerateAll().catch(console.error);
