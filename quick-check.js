const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function quickCheck() {
  // Contar propuestas día 19
  const nov19 = await prisma.timeSlot.count({
    where: {
      start: { gte: new Date('2025-11-19T00:00:00.000Z'), lt: new Date('2025-11-20T00:00:00.000Z') },
      courtId: null
    }
  });
  
  console.log(` Día 19 nov: ${nov19} propuestas`);
  
  if (nov19 < 100) {
    console.log(`\n PROBLEMA: Solo hay ${nov19} clases, deberían ser ~150`);
    console.log('   Regenerando día 19...\n');
    
    const response = await fetch('http://localhost:9002/api/cron/generate-cards?targetDay=0');
    const result = await response.json();
    console.log(`   Resultado: ${result.created} clases creadas`);
  } else {
    console.log(' Día 19 tiene suficientes clases');
  }
  
  // Total general
  const total = await prisma.timeSlot.count({ where: { courtId: null } });
  console.log(`\n Total propuestas: ${total}`);
  
  console.log('\n CAMBIO APLICADO:');
  console.log('   API del calendario ahora filtra bookings CANCELLED');
  console.log('   Solo muestra jugadores de bookings CONFIRMED o PENDING');
  console.log('\n PRÓXIMO PASO:');
  console.log('   Ctrl+Shift+R para refrescar el calendario');
  
  await prisma.$disconnect();
}

quickCheck();
