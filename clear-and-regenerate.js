const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearAndRegenerate() {
  console.log('  Eliminando propuestas existentes...\n');
  
  // Eliminar todas las propuestas (courtId NULL)
  const deleted = await prisma.timeSlot.deleteMany({
    where: { courtNumber: null }
  });
  
  console.log(` ${deleted.count} propuestas eliminadas\n`);
  console.log(' Esperando 3 segundos antes de regenerar...\n');
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  console.log(' Llamando al generador para 30 días...\n');
  
  const response = await fetch('http://localhost:9002/api/cron/generate-cards?days=30', {
    method: 'GET'
  });
  
  const data = await response.json();
  
  console.log(' Resultado:', JSON.stringify(data, null, 2));
  
  // Verificar total
  const total = await prisma.timeSlot.count({
    where: { courtNumber: null }
  });
  
  console.log(`\n Total de propuestas en DB: ${total}`);
  
  await prisma.$disconnect();
}

clearAndRegenerate();
