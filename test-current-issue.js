/**
 * Test para diagnosticar el problema de "solo 7 tarjetas"
 */

async function testIssue() {
  console.log('🔍 Diagnóstico: Por qué solo se ven 7 tarjetas\n');
  
  const clubId = 'padel-estrella-madrid';
  
  // Test 1: Sin fecha (comportamiento actual sospechoso)
  console.log('📍 TEST 1: Sin parámetro date (lo que hace el frontend)');
  const url1 = `http://localhost:9002/api/timeslots?clubId=${clubId}`;
  console.log('URL:', url1);
  
  try {
    const response1 = await fetch(url1);
    const data1 = await response1.json();
    const slots1 = data1.slots || [];
    
    console.log(`✅ Slots devueltos: ${slots1.length}`);
    console.log(`📄 Pagination:`, data1.pagination);
    
    if (slots1.length > 0) {
      console.log(`\n📋 Primeros 3 slots:`);
      slots1.slice(0, 3).forEach((slot, i) => {
        const startDate = new Date(slot.start);
        console.log(`   ${i+1}. ${slot.instructor?.name || 'Sin instructor'} | ${startDate.toISOString()} | ${slot.level}`);
      });
    }
  } catch (error) {
    console.error('❌ Error test 1:', error.message);
  }
  
  // Test 2: Con fecha específica  
  console.log('\n\n📍 TEST 2: Con date=2025-11-24 (hoy)');
  const url2 = `http://localhost:9002/api/timeslots?clubId=${clubId}&date=2025-11-24`;
  console.log('URL:', url2);
  
  try {
    const response2 = await fetch(url2);
    const data2 = await response2.json();
    const slots2 = data2.slots || [];
    
    console.log(`✅ Slots devueltos: ${slots2.length}`);
    console.log(`📄 Pagination:`, data2.pagination);
    
    if (slots2.length > 0) {
      console.log(`\n📋 Todos los slots de hoy:`);
      slots2.forEach((slot, i) => {
        const startDate = new Date(slot.start);
        console.log(`   ${i+1}. ${slot.instructor?.name || 'Sin instructor'} | ${startDate.toISOString().substring(11,16)} | ${slot.level} | ${slot.genderCategory || 'sin categoría'}`);
      });
    }
  } catch (error) {
    console.error('❌ Error test 2:', error.message);
  }
  
  // Test 3: Verificar cuántos slots hay en total en la BD
  console.log('\n\n📍 TEST 3: Total en base de datos');
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  
  const totalCount = await prisma.timeSlot.count({
    where: { clubId }
  });
  
  console.log(`💾 Total slots en BD: ${totalCount}`);
  
  // Slots de hoy
  const today = new Date('2025-11-24T00:00:00.000Z');
  const tomorrow = new Date('2025-11-24T23:59:59.999Z');
  
  const todayCount = await prisma.timeSlot.count({
    where: {
      clubId,
      start: {
        gte: today,
        lte: tomorrow
      }
    }
  });
  
  console.log(`📅 Slots para 2025-11-24: ${todayCount}`);
  
  await prisma.$disconnect();
  
  console.log('\n\n🎯 DIAGNÓSTICO:');
  console.log(`   - Si TEST 1 devuelve pocos slots (ej: 7) → problema de paginación/límite por defecto`);
  console.log(`   - Si TEST 2 devuelve 0 slots → problema de fecha (no hay datos para hoy)`);
  console.log(`   - Si BD tiene muchos slots pero API devuelve pocos → problema en la query del API`);
}

setTimeout(testIssue, 1000);
