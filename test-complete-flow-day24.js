const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupAndTest() {
  console.log('🧹 LIMPIEZA Y PRUEBA COMPLETA\n');
  
  const ts = new Date('2025-11-24T07:00:00').getTime();
  
  // 1. Limpiar todas las tarjetas del día 24 a las 7:00
  console.log('1️⃣ Eliminando todas las tarjetas del día 24 a las 7:00...\n');
  
  await prisma.$executeRaw`DELETE FROM Booking WHERE timeSlotId IN (
    SELECT id FROM TimeSlot WHERE start = ${ts}
  )`;
  
  await prisma.$executeRaw`DELETE FROM TimeSlot WHERE start = ${ts}`;
  
  console.log('   ✅ Tarjetas eliminadas\n');
  
  // 2. Crear 5 tarjetas ABIERTO/mixto (una por cada instructor)
  console.log('2️⃣ Creando 5 tarjetas ABIERTO/mixto...\n');
  
  const instructors = await prisma.instructor.findMany({
    take: 5,
    select: { id: true, name: true, clubId: true }
  });
  
  for (const inst of instructors) {
    await prisma.timeSlot.create({
      data: {
        clubId: inst.clubId,
        instructorId: inst.id,
        start: new Date('2025-11-24T07:00:00'),
        end: new Date('2025-11-24T07:30:00'),
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
    console.log(`   ✅ ${inst.name}: ABIERTO/mixto`);
  }
  
  console.log('\n3️⃣ ESTADO INICIAL:\n');
  
  const initial = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*) as total FROM TimeSlot WHERE start = ${ts}
  `);
  
  console.log(`   📊 Total tarjetas: ${initial[0].total}\n`);
  
  // 4. Hacer una reserva
  console.log('4️⃣ Haciendo reserva con Marc Parra en la primera tarjeta...\n');
  
  const marc = await prisma.user.findFirst({
    where: { email: 'marc.parra@hotmail.es' }
  });
  
  const firstSlot = await prisma.$queryRawUnsafe(`
    SELECT ts.*, i.name as instName 
    FROM TimeSlot ts 
    JOIN Instructor i ON ts.instructorId = i.id
    WHERE ts.start = ${ts} 
    LIMIT 1
  `);
  
  console.log(`   📅 Reservando con: ${firstSlot[0].instName}`);
  console.log(`   👤 Usuario: Marc Parra (${marc.level}/${marc.gender})\n`);
  
  const response = await fetch('http://localhost:9002/api/classes/book', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      timeSlotId: firstSlot[0].id,
      userId: marc.id,
      groupSize: 1
    })
  });
  
  const result = await response.json();
  
  if (!response.ok) {
    console.log(`   ❌ Error: ${result.error || result.message}\n`);
  } else {
    console.log(`   ✅ Reserva exitosa\n`);
  }
  
  // 5. Verificar resultado
  console.log('5️⃣ ESTADO FINAL:\n');
  
  const final = await prisma.$queryRawUnsafe(`
    SELECT ts.*, i.name as instructorName,
           (SELECT COUNT(*) FROM Booking WHERE timeSlotId = ts.id AND status != 'CANCELLED') as bookingCount
    FROM TimeSlot ts
    JOIN Instructor i ON ts.instructorId = i.id
    WHERE ts.start = ${ts}
    ORDER BY i.name, ts.level DESC
  `);
  
  console.log(`   📊 Total tarjetas: ${final.length}\n`);
  
  const byInstructor = {};
  final.forEach(s => {
    if (!byInstructor[s.instructorName]) byInstructor[s.instructorName] = [];
    byInstructor[s.instructorName].push(s);
  });
  
  Object.entries(byInstructor).forEach(([inst, cards]) => {
    console.log(`   👨‍🏫 ${inst}: ${cards.length} tarjeta(s)`);
    cards.forEach(s => {
      console.log(`      ${s.level.padEnd(12)} | ${(s.genderCategory||'N/A').padEnd(10)} | ${s.bookingCount} reserva(s)`);
    });
  });
  
  console.log('\n🎯 VERIFICACIÓN:\n');
  
  const instructorWithBooking = firstSlot[0].instName;
  const instructorCards = byInstructor[instructorWithBooking];
  
  if (instructorCards && instructorCards.length === 2) {
    const classified = instructorCards.find(c => c.level !== 'ABIERTO');
    const open = instructorCards.find(c => c.level === 'ABIERTO');
    
    if (classified && open) {
      console.log(`   ✅ ${instructorWithBooking} tiene 2 tarjetas:`);
      console.log(`      • Clasificada: ${classified.level}/${classified.genderCategory}`);
      console.log(`      • Duplicada: ABIERTO/mixto`);
      console.log('\n   🎉 ¡FUNCIONA CORRECTAMENTE!');
    }
  } else {
    console.log(`   ❌ ${instructorWithBooking} debería tener 2 tarjetas pero tiene ${instructorCards?.length || 0}`);
  }
  
  const totalExpected = 6; // 5 iniciales + 1 duplicada
  if (final.length === totalExpected) {
    console.log(`\n   ✅ Total correcto: ${final.length} tarjetas (5 iniciales + 1 nueva)`);
  } else {
    console.log(`\n   ❌ Total incorrecto: ${final.length} tarjetas (esperado: ${totalExpected})`);
  }
  
  prisma.$disconnect();
}

cleanupAndTest();
