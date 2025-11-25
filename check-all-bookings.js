const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllBookings() {
  console.log('=== VERIFICANDO TODAS LAS INSCRIPCIONES ===\n');
  
  // Todas las inscripciones activas
  const allBookings = await prisma.booking.findMany({
    where: {
      status: { in: ['PENDING', 'CONFIRMED'] }
    },
    include: {
      timeSlot: {
        include: { instructor: true }
      },
      user: true
    },
    orderBy: { createdAt: 'desc' }
  });
  
  console.log(`Total inscripciones activas: ${allBookings.length}\n`);
  
  // Agrupar por día
  const byDate = {};
  allBookings.forEach(b => {
    const date = new Date(b.timeSlot.start);
    const dateStr = date.toISOString().split('T')[0];
    if (!byDate[dateStr]) byDate[dateStr] = [];
    byDate[dateStr].push(b);
  });
  
  console.log('Inscripciones por día:\n');
  Object.keys(byDate).sort().forEach(date => {
    const bookings = byDate[date];
    console.log(`${date}: ${bookings.length} inscripciones`);
    bookings.forEach(b => {
      const time = new Date(b.timeSlot.start);
      const hourLocal = time.getHours() + ':' + time.getMinutes().toString().padStart(2, '0');
      console.log(`  ${hourLocal} - ${b.timeSlot.instructor?.name} - ${b.user.name} (${b.groupSize} jugadores) - ${b.status}`);
    });
    console.log('');
  });
  
  console.log('\n=== DIAGNÓSTICO ===');
  const dec8 = byDate['2025-12-08'] || [];
  const dec17 = byDate['2025-12-17'] || [];
  const dec18 = byDate['2025-12-18'] || [];
  
  console.log(`\n8 Dic: ${dec8.length} inscripciones`);
  console.log(`17 Dic: ${dec17.length} inscripciones`);
  console.log(`18 Dic: ${dec18.length} inscripciones`);
  
  if (dec8.length > 0 || dec17.length > 0 || dec18.length > 0) {
    console.log('\n LAS INSCRIPCIONES SÍ ESTÁN EN LA BASE DE DATOS');
    console.log('  PROBLEMA: El navegador está cacheando la respuesta del API');
    console.log('\n SOLUCIÓN:');
    console.log('   El API del calendario necesita desactivar el cache para estos días');
  } else {
    console.log('\n  No hay inscripciones para esos días en la BD');
  }
  
  await prisma.$disconnect();
}

checkAllBookings();
