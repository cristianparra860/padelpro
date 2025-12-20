const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findDec9Classes() {
  console.log('\n🔍 BUSCANDO TODAS LAS CLASES DEL 9 DIC 9:00 CON CARLOS MARTINEZ\n');
  console.log('='.repeat(80));
  
  const dec9Start = new Date('2025-12-09T08:00:00.000Z').getTime(); // 09:00 CET = 08:00 UTC
  const dec9End = new Date('2025-12-09T09:00:00.000Z').getTime();
  
  // Buscar todas las clases de Carlos a esa hora
  const carlosSlots = await prisma.$queryRaw`
    SELECT 
      ts.id,
      ts.start,
      ts.maxPlayers,
      ts.hasRecycledSlots,
      ts.courtNumber,
      ts.level,
      ts.genderCategory,
      i.name as instructorName,
      u.name as instructorUserName
    FROM TimeSlot ts
    LEFT JOIN Instructor i ON ts.instructorId = i.id
    LEFT JOIN User u ON i.userId = u.id
    WHERE ts.start >= ${dec9Start}
    AND ts.start < ${dec9End}
    AND (u.name LIKE '%Carlos%' OR i.name LIKE '%Carlos%')
  `;
  
  console.log(`📊 Clases de Carlos el 9/dic a las 9:00: ${carlosSlots.length}\n`);
  
  for (const slot of carlosSlots) {
    console.log('='.repeat(80));
    console.log(`\n🎾 ${slot.instructorUserName || slot.instructorName}`);
    console.log(`   TimeSlot ID: ${slot.id}`);
    console.log(`   🎾 Pista: ${slot.courtNumber || 'Sin asignar'}`);
    console.log(`   📊 Nivel: ${slot.level}`);
    console.log(`   ⚧ Categoría: ${slot.genderCategory || 'N/A'}`);
    console.log(`   👥 Max: ${slot.maxPlayers}`);
    console.log(`   ♻️ hasRecycledSlots: ${slot.hasRecycledSlots === 1 ? 'SÍ ✅' : 'NO ❌'}`);
    
    // Buscar TODOS los bookings
    const allBookings = await prisma.$queryRaw`
      SELECT 
        b.id,
        b.userId,
        b.status,
        b.isRecycled,
        b.groupSize,
        u.name as userName
      FROM Booking b
      LEFT JOIN User u ON b.userId = u.id
      WHERE b.timeSlotId = ${slot.id}
      ORDER BY b.status DESC, b.createdAt
    `;
    
    console.log(`   📋 Bookings: ${allBookings.length}`);
    
    if (allBookings.length > 0) {
      allBookings.forEach(b => {
        console.log(`      ${b.status === 'CANCELLED' ? '❌' : '✅'} ${b.userName}: ${b.groupSize} plaza(s) - ${b.status}${b.isRecycled === 1 ? ' ♻️' : ''}`);
      });
      
      const active = allBookings.filter(b => b.status !== 'CANCELLED');
      const cancelled = allBookings.filter(b => b.status === 'CANCELLED');
      const occupied = active.reduce((sum, b) => sum + b.groupSize, 0);
      
      console.log(`   📊 Activos: ${active.length} (${occupied}/${slot.maxPlayers} plazas)`);
      console.log(`   ❌ Cancelados: ${cancelled.length}`);
      
      if (cancelled.length > 0 && slot.courtNumber && slot.hasRecycledSlots === 0) {
        console.log(`   🔴 PROBLEMA: Clase confirmada con cancelaciones pero hasRecycledSlots=false`);
      }
    }
    
    console.log('');
  }
  
  // También buscar si hay clases con groupSize=2 (clase de dos jugadores)
  console.log('\n' + '='.repeat(80));
  console.log('\n🔍 BUSCANDO CLASES CON MAXPLAYERS=2 EL 9 DIC\n');
  
  const twoPlayerClasses = await prisma.$queryRaw`
    SELECT 
      ts.id,
      ts.start,
      ts.maxPlayers,
      ts.courtNumber,
      ts.hasRecycledSlots,
      i.name as instructorName,
      u.name as instructorUserName
    FROM TimeSlot ts
    LEFT JOIN Instructor i ON ts.instructorId = i.id
    LEFT JOIN User u ON i.userId = u.id
    WHERE ts.start >= ${dec9Start}
    AND ts.start < ${dec9End + 3600000}
    AND ts.maxPlayers = 2
  `;
  
  console.log(`📊 Clases de 2 jugadores: ${twoPlayerClasses.length}\n`);
  
  for (const slot of twoPlayerClasses) {
    console.log(`🎾 ${slot.instructorUserName || slot.instructorName} - ${new Date(Number(slot.start)).toLocaleTimeString('es-ES')}`);
    console.log(`   ID: ${slot.id}`);
    console.log(`   Pista: ${slot.courtNumber || 'Sin asignar'}`);
    console.log(`   ♻️ hasRecycledSlots: ${slot.hasRecycledSlots === 1 ? 'SÍ' : 'NO'}`);
    
    const bookings = await prisma.$queryRaw`
      SELECT 
        b.id,
        b.status,
        b.isRecycled,
        b.groupSize,
        u.name as userName
      FROM Booking b
      LEFT JOIN User u ON b.userId = u.id
      WHERE b.timeSlotId = ${slot.id}
    `;
    
    console.log(`   Bookings: ${bookings.length}`);
    bookings.forEach(b => {
      console.log(`      ${b.status === 'CANCELLED' ? '❌' : '✅'} ${b.userName}: ${b.status}${b.isRecycled === 1 ? ' ♻️' : ''}`);
    });
    console.log('');
  }
  
  await prisma.$disconnect();
}

findDec9Classes().catch(console.error);
