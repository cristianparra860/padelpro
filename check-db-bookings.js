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
        include: { instructor: true }
      },
      user: true
    },
    orderBy: { createdAt: 'desc' }
  });
  
  console.log(`DÍA 17 DIC: ${dec17.length} bookings encontrados en la base de datos\n`);
  
  if (dec17.length > 0) {
    dec17.forEach(b => {
      const date = new Date(b.timeSlot.start);
      const hourLocal = date.getHours() + ':' + date.getMinutes().toString().padStart(2, '0');
      console.log(`  ${hourLocal} - ${b.timeSlot.instructor?.name}`);
      console.log(`    Usuario: ${b.user.name}`);
      console.log(`    GroupSize: ${b.groupSize}, Status: ${b.status}`);
      console.log(`    ID: ${b.id}\n`);
    });
  } else {
    console.log('   No hay inscripciones guardadas para el día 17\n');
  }
  
  // Día 18
  const dec18 = await prisma.booking.findMany({
    where: {
      timeSlot: {
        start: { gte: new Date('2025-12-18T00:00:00.000Z'), lt: new Date('2025-12-19T00:00:00.000Z') }
      }
    },
    include: {
      timeSlot: {
        include: { instructor: true }
      },
      user: true
    },
    orderBy: { createdAt: 'desc' }
  });
  
  console.log(`DÍA 18 DIC: ${dec18.length} bookings encontrados en la base de datos\n`);
  
  if (dec18.length > 0) {
    dec18.forEach(b => {
      const date = new Date(b.timeSlot.start);
      const hourLocal = date.getHours() + ':' + date.getMinutes().toString().padStart(2, '0');
      console.log(`  ${hourLocal} - ${b.timeSlot.instructor?.name}`);
      console.log(`    Usuario: ${b.user.name}`);
      console.log(`    GroupSize: ${b.groupSize}, Status: ${b.status}`);
      console.log(`    ID: ${b.id}\n`);
    });
  } else {
    console.log('   No hay inscripciones guardadas para el día 18\n');
  }
  
  console.log('\n=== DIAGNÓSTICO ===');
  console.log('\n UBICACIÓN DE LA BASE DE DATOS:');
  console.log('   Archivo: prisma/dev.db (SQLite)');
  console.log('   Tipo: Base de datos LOCAL (archivo en disco)');
  
  console.log('\n  IMPORTANTE - SQLite es LOCAL:');
  console.log('   1. Cada dispositivo tiene su propia copia del archivo dev.db');
  console.log('   2. Las inscripciones NO se sincronizan entre navegadores');
  console.log('   3. Si abres en otro navegador/dispositivo, verá una DB diferente');
  console.log('   4. Solo el servidor en localhost:9002 accede a este archivo');
  
  console.log('\n PARA PRODUCCIÓN:');
  console.log('   Necesitas migrar a PostgreSQL/MySQL en la nube');
  console.log('   Ejemplo: Supabase, PlanetScale, Railway, etc.');
  
  await prisma.$disconnect();
}

checkBookings();
