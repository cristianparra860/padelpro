const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  // Crear una fecha de hoy a las 8:00 AM local
  const today8am = new Date();
  today8am.setHours(8, 0, 0, 0);
  
  console.log('🔍 Buscando slots >= 8:00 AM de hoy\n');
  console.log(`Fecha de búsqueda: ${today8am.toLocaleString('es-ES')}`);
  console.log(`ISO: ${today8am.toISOString()}\n`);
  
  const slots = await prisma.timeSlot.findMany({
    where: {
      start: {
        gte: today8am
      },
      courtNumber: null
    },
    orderBy: {
      start: 'asc'
    },
    take: 15
  });
  
  console.log(`Primeros 15 slots encontrados:\n`);
  
  slots.forEach((slot, i) => {
    const d = new Date(slot.start);
    console.log(`${(i+1).toString().padStart(2)}. ${d.toLocaleString('es-ES')} | ISO: ${d.toISOString()}`);
  });
  
  await prisma.$disconnect();
})();
