const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzePerformance() {
  console.log('🔍 Analizando rendimiento de consultas clave\n');
  
  const userId = 'cmhkwi8so0001tggo0bwojrjy';
  
  // 1. Consulta de TimeSlots (página de clases)
  console.log('1️⃣ Cargando TimeSlots disponibles...');
  const start1 = Date.now();
  const now = Date.now();
  const timeSlots = await prisma.$queryRaw`
    SELECT ts.*, 
           i.name as instructorName,
           COUNT(DISTINCT b.id) as bookingCount
    FROM TimeSlot ts
    LEFT JOIN Instructor i ON ts.instructorId = i.id
    LEFT JOIN Booking b ON ts.id = b.timeSlotId AND b.status IN ('PENDING', 'CONFIRMED')
    WHERE ts.clubId = 'padel-estrella-madrid'
    AND ts.start >= ${now}
    GROUP BY ts.id
    LIMIT 50
  `;
  const time1 = Date.now() - start1;
  console.log(`   ⏱️ ${time1}ms - ${timeSlots.length} slots\n`);
  
  // 2. Consulta de reservas del usuario (Mi Agenda)
  console.log('2️⃣ Cargando reservas del usuario...');
  const start2 = Date.now();
  const bookings = await prisma.booking.findMany({
    where: { userId },
    include: {
      timeSlot: {
        include: {
          instructor: true,
          club: true
        }
      }
    }
  });
  const time2 = Date.now() - start2;
  console.log(`   ⏱️ ${time2}ms - ${bookings.length} reservas\n`);
  
  // 3. Actualizar créditos bloqueados
  console.log('3️⃣ Calculando créditos bloqueados...');
  const start3 = Date.now();
  const pending = await prisma.booking.findMany({
    where: { userId, status: 'PENDING' },
    select: { amountBlocked: true }
  });
  const blocked = pending.reduce((sum, b) => sum + b.amountBlocked, 0);
  const time3 = Date.now() - start3;
  console.log(`   ⏱️ ${time3}ms - ${pending.length} pendientes, €${(blocked/100).toFixed(2)} bloqueado\n`);
  
  // 4. Consulta de transacciones
  console.log('4️⃣ Cargando transacciones...');
  const start4 = Date.now();
  const transactions = await prisma.transaction.findMany({
    where: { userId },
    take: 50,
    orderBy: { createdAt: 'desc' }
  });
  const time4 = Date.now() - start4;
  console.log(`   ⏱️ ${time4}ms - ${transactions.length} transacciones\n`);
  
  // 5. Verificar índices
  console.log('5️⃣ Verificando estructura de tablas...');
  const tables = await prisma.$queryRaw`
    SELECT name FROM sqlite_master WHERE type='table' ORDER BY name
  `;
  console.log(`   📊 ${tables.length} tablas en la BD\n`);
  
  // Resumen
  console.log('📊 RESUMEN DE RENDIMIENTO:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`TimeSlots (página clases): ${time1}ms ${time1 > 500 ? '🔴 LENTO' : time1 > 200 ? '🟡 MEJORABLE' : '🟢 OK'}`);
  console.log(`Reservas (Mi Agenda): ${time2}ms ${time2 > 500 ? '🔴 LENTO' : time2 > 200 ? '🟡 MEJORABLE' : '🟢 OK'}`);
  console.log(`Créditos bloqueados: ${time3}ms ${time3 > 100 ? '🟡 MEJORABLE' : '🟢 OK'}`);
  console.log(`Transacciones: ${time4}ms ${time4 > 200 ? '🟡 MEJORABLE' : '🟢 OK'}`);
  
  const total = time1 + time2 + time3 + time4;
  console.log(`\nTiempo total: ${total}ms`);
  
  if (time1 > 500 || time2 > 500) {
    console.log('\n⚠️ OPTIMIZACIONES RECOMENDADAS:');
    if (time1 > 500) console.log('  - Agregar índice en TimeSlot.start y TimeSlot.clubId');
    if (time2 > 500) console.log('  - Agregar índice en Booking.userId');
    console.log('  - Limitar includes solo a datos necesarios');
    console.log('  - Implementar paginación en listas largas');
    console.log('  - Usar caché para datos que no cambian frecuentemente');
  }
  
  await prisma.$disconnect();
}

analyzePerformance().catch(console.error);
