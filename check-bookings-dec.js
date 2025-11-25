const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBookings() {
  console.log('=== VERIFICANDO INSCRIPCIONES DÍA 17 Y 18 ===\n');
  
  // Día 17
  const dec17 = await prisma.booking.findMany({
    where: {
      timeSlot: {
        start: { gte: new Date('2025-12-17T00:00:00.000Z'), lt: new Date('2025-12-18T00:00:00.000Z') }
      }
    },
    include: {
      timeSlot: {
        select: { start: true },
        include: { instructor: { select: { name: true } } }
      },
      user: { select: { name: true, email: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
  
  console.log(`DÍA 17 DIC: ${dec17.length} bookings\n`);
  
  dec17.forEach(b => {
    const date = new Date(b.timeSlot.start);
    const hourLocal = date.getHours() + ':' + date.getMinutes().toString().padStart(2, '0');
    console.log(`  ${hourLocal} - ${b.timeSlot.instructor?.name}`);
    console.log(`    Usuario: ${b.user.name} (${b.user.email})`);
    console.log(`    GroupSize: ${b.groupSize}, Status: ${b.status}`);
    console.log(`    Creado: ${b.createdAt.toISOString()}`);
    console.log(`    ID: ${b.id}\n`);
  });
  
  // Día 18
  const dec18 = await prisma.booking.findMany({
    where: {
      timeSlot: {
        start: { gte: new Date('2025-12-18T00:00:00.000Z'), lt: new Date('2025-12-19T00:00:00.000Z') }
      }
    },
    include: {
      timeSlot: {
        select: { start: true },
        include: { instructor: { select: { name: true } } }
      },
      user: { select: { name: true, email: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
  
  console.log(`\nDÍA 18 DIC: ${dec18.length} bookings\n`);
  
  dec18.forEach(b => {
    const date = new Date(b.timeSlot.start);
    const hourLocal = date.getHours() + ':' + date.getMinutes().toString().padStart(2, '0');
    console.log(`  ${hourLocal} - ${b.timeSlot.instructor?.name}`);
    console.log(`    Usuario: ${b.user.name} (${b.user.email})`);
    console.log(`    GroupSize: ${b.groupSize}, Status: ${b.status}`);
    console.log(`    Creado: ${b.createdAt.toISOString()}`);
    console.log(`    ID: ${b.id}\n`);
  });
  
  // Verificar en qué archivo está la base de datos
  console.log('\n=== INFORMACIÓN DE LA BASE DE DATOS ===');
  console.log('Archivo DB: prisma/dev.db');
  console.log('Esta DB es LOCAL y no se comparte entre dispositivos');
  console.log('\n IMPORTANTE:');
  console.log('   SQLite es una base de datos de archivo local');
  console.log('   Cada navegador/dispositivo tiene su propia copia');
  console.log('   Las inscripciones NO se sincronizan automáticamente');
  
  await prisma.$disconnect();
}

checkBookings();
