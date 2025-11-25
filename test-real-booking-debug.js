const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testRealBooking() {
  console.log('🧪 PRUEBA REAL DE INSCRIPCIÓN\n');
  
  // Limpiar día 25 a las 8:00 para hacer prueba fresca
  const testDate = new Date('2025-11-25T08:00:00Z'); // UTC
  const testTimestamp = testDate.getTime();
  
  console.log('1️⃣ Limpiando tarjetas del día 25 a las 8:00 UTC...\n');
  
  await prisma.$executeRaw`DELETE FROM Booking WHERE timeSlotId IN (
    SELECT id FROM TimeSlot WHERE start = ${testTimestamp}
  )`;
  
  await prisma.$executeRaw`DELETE FROM TimeSlot WHERE start = ${testTimestamp}`;
  
  console.log('2️⃣ Creando 3 tarjetas ABIERTO/mixto...\n');
  
  const instructors = await prisma.instructor.findMany({
    take: 3,
    select: { id: true, name: true, clubId: true }
  });
  
  for (const inst of instructors) {
    await prisma.timeSlot.create({
      data: {
        clubId: inst.clubId,
        instructorId: inst.id,
        start: testDate,
        end: new Date(testTimestamp + 30 * 60 * 1000),
        maxPlayers: 4,
        totalPrice: 25,
        instructorPrice: 15,
        courtRentalPrice: 10,
        level: 'ABIERTO',
        genderCategory: 'mixto',
        category: 'clase',
        courtId: null,
        courtNumber: null
      }
    });
    console.log(`   ✅ ${inst.name}`);
  }
  
  // Verificar ANTES
  const before = await prisma.timeSlot.count({
    where: { start: testDate }
  });
  
  console.log(`\n3️⃣ ANTES: ${before} tarjetas\n`);
  
  // Hacer reserva
  const marc = await prisma.user.findFirst({
    where: { email: 'marc.parra@hotmail.es' }
  });
  
  const firstSlot = await prisma.timeSlot.findFirst({
    where: { start: testDate }
  });
  
  console.log(`4️⃣ Haciendo reserva...\n`);
  console.log(`   TimeSlot ID: ${firstSlot.id}`);
  console.log(`   User ID: ${marc.id}`);
  console.log(`   Llamando a: POST /api/classes/book\n`);
  
  const response = await fetch('http://localhost:9002/api/classes/book', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      timeSlotId: firstSlot.id,
      userId: marc.id,
      groupSize: 1
    })
  });
  
  const result = await response.json();
  
  console.log(`   Status: ${response.status}`);
  console.log(`   Response:`, JSON.stringify(result, null, 2));
  
  // Esperar un momento
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Verificar DESPUÉS
  const after = await prisma.$queryRawUnsafe(`
    SELECT ts.*, i.name as instructorName,
           (SELECT COUNT(*) FROM Booking WHERE timeSlotId = ts.id AND status != 'CANCELLED') as bookingCount
    FROM TimeSlot ts
    JOIN Instructor i ON ts.instructorId = i.id
    WHERE ts.start = ${testTimestamp}
    ORDER BY i.name, ts.level DESC
  `);
  
  console.log(`\n5️⃣ DESPUÉS: ${after.length} tarjetas\n`);
  
  const byInst = {};
  after.forEach(s => {
    if (!byInst[s.instructorName]) byInst[s.instructorName] = [];
    byInst[s.instructorName].push(s);
  });
  
  Object.entries(byInst).forEach(([inst, cards]) => {
    console.log(`   👨‍🏫 ${inst}: ${cards.length} tarjeta(s)`);
    cards.forEach(c => {
      console.log(`      • ${c.level}/${c.genderCategory || 'N/A'} (${c.bookingCount} reservas)`);
    });
  });
  
  console.log('\n🎯 RESULTADO:\n');
  
  if (after.length === before + 1) {
    console.log(`   ✅ FUNCIONA: ${before} tarjetas → ${after.length} tarjetas`);
  } else {
    console.log(`   ❌ NO FUNCIONA: ${before} tarjetas → ${after.length} tarjetas (esperado: ${before + 1})`);
    console.log('\n📋 Verificando qué pasó en el booking...');
    
    const booking = await prisma.booking.findFirst({
      where: { timeSlotId: firstSlot.id },
      select: { id: true, status: true, groupSize: true }
    });
    
    if (booking) {
      console.log(`   Booking creado: ${booking.id}`);
      console.log(`   Status: ${booking.status}`);
      console.log(`   GroupSize: ${booking.groupSize}`);
    } else {
      console.log(`   ❌ No se creó ningún booking`);
    }
    
    // Verificar si el TimeSlot se clasificó
    const updatedSlot = await prisma.timeSlot.findUnique({
      where: { id: firstSlot.id },
      select: { level: true, genderCategory: true }
    });
    
    console.log(`\n   TimeSlot original:`);
    console.log(`   Level: ${updatedSlot.level}`);
    console.log(`   Gender: ${updatedSlot.genderCategory}`);
    
    if (updatedSlot.level !== 'ABIERTO') {
      console.log(`\n   ⚠️ El slot se clasificó pero NO se creó la duplicada`);
      console.log(`   🐛 BUG: El código de creación de duplicada no se ejecutó`);
    }
  }
  
  prisma.$disconnect();
}

testRealBooking();
