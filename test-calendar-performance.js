/**
 * Test de rendimiento del calendario optimizado
 * Verifica que las queries sean rápidas y eficientes
 */

const { prisma } = require('./src/lib/prisma.ts');

async function testCalendarPerformance() {
  console.log('🚀 Iniciando test de rendimiento del calendario...\n');
  
  const clubId = 'club-1';
  const now = new Date();
  const startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
  const endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();

  // Test 1: Query optimizada con JOIN
  console.log('⚡ Test 1: Query con JOIN (nueva implementación)');
  const start1 = Date.now();
  
  const querySQL = `
    SELECT 
      ts.id,
      ts.start,
      ts.end,
      ts.maxPlayers,
      ts.totalPrice,
      ts.level,
      ts.category,
      ts.levelRange,
      ts.courtId,
      ts.courtNumber,
      ts.instructorId,
      ts.clubId,
      i.id as instructor_id,
      i.hourlyRate as instructor_hourlyRate,
      u.name as instructor_name,
      u.profilePictureUrl as instructor_photo,
      GROUP_CONCAT(
        b.id || '|' || 
        b.userId || '|' || 
        b.status || '|' || 
        COALESCE(b.groupSize, 1) || '|' ||
        COALESCE(b.isRecycled, 0) || '|' ||
        COALESCE(bu.name, 'Sin nombre') || '|' ||
        COALESCE(bu.profilePictureUrl, '')
      ) as bookings_data
    FROM TimeSlot ts
    LEFT JOIN Instructor i ON ts.instructorId = i.id
    LEFT JOIN User u ON i.userId = u.id
    LEFT JOIN Booking b ON ts.id = b.timeSlotId AND b.status IN ('PENDING', 'CONFIRMED', 'CANCELLED')
    LEFT JOIN User bu ON b.userId = bu.id
    WHERE ts.start >= ? AND ts.start <= ? AND ts.clubId = ?
    GROUP BY ts.id
    ORDER BY ts.start ASC
  `;
  
  const classesWithData = await prisma.$queryRawUnsafe(querySQL, startTime, endTime, clubId);
  const time1 = Date.now() - start1;
  
  console.log(`✅ Resultados: ${classesWithData.length} clases cargadas`);
  console.log(`⏱️  Tiempo: ${time1}ms`);
  console.log(`📊 Queries ejecutadas: 1 (JOIN optimizado)\n`);

  // Test 2: Método antiguo con N+1 queries (para comparación)
  console.log('🐌 Test 2: Método antiguo con múltiples queries');
  const start2 = Date.now();
  
  // Query 1: Cargar TimeSlots
  const timeSlots = await prisma.$queryRawUnsafe(
    `SELECT id, start, end, maxPlayers, totalPrice, level, category, levelRange, courtId, courtNumber, instructorId, clubId
     FROM TimeSlot
     WHERE start >= ? AND start <= ? AND clubId = ?
     ORDER BY start ASC`,
    startTime, endTime, clubId
  );
  
  // Query 2: Cargar instructores
  const instructorIds = [...new Set(timeSlots.map(ts => ts.instructorId).filter(Boolean))];
  const instructors = await prisma.instructor.findMany({
    where: { id: { in: instructorIds } },
    include: { user: { select: { name: true, profilePictureUrl: true } } }
  });
  
  // Query 3: Cargar bookings
  const timeSlotIds = timeSlots.map(ts => ts.id);
  const bookings = await prisma.booking.findMany({
    where: {
      timeSlotId: { in: timeSlotIds },
      status: { in: ['PENDING', 'CONFIRMED', 'CANCELLED'] }
    },
    include: { user: { select: { name: true, profilePictureUrl: true } } }
  });
  
  const time2 = Date.now() - start2;
  
  console.log(`✅ Resultados: ${timeSlots.length} clases cargadas`);
  console.log(`⏱️  Tiempo: ${time2}ms`);
  console.log(`📊 Queries ejecutadas: 3 (TimeSlots + Instructores + Bookings)\n`);

  // Comparación
  console.log('📈 COMPARACIÓN DE RENDIMIENTO:');
  console.log(`   Método optimizado (JOIN): ${time1}ms`);
  console.log(`   Método antiguo (N+1):     ${time2}ms`);
  console.log(`   Mejora: ${((1 - time1/time2) * 100).toFixed(1)}% más rápido`);
  console.log(`   Reducción de queries: 3 → 1 (66% menos)\n`);

  // Test 3: Verificar índices
  console.log('🔍 Test 3: Verificando índices de base de datos');
  const indexes = await prisma.$queryRaw`
    SELECT name, sql FROM sqlite_master 
    WHERE type='index' AND tbl_name IN ('TimeSlot', 'Booking', 'MatchGame')
    ORDER BY tbl_name, name
  `;
  
  console.log('Índices encontrados:');
  indexes.forEach(idx => {
    if (idx.sql) {
      console.log(`  ✅ ${idx.name}`);
    }
  });

  console.log('\n✨ Test completado exitosamente!');
  process.exit(0);
}

testCalendarPerformance().catch(err => {
  console.error('❌ Error en test:', err);
  process.exit(1);
});
