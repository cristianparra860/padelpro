const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testProposalsEndpoint() {
  try {
    console.log('🔍 Buscando propuestas en la base de datos...\n');
    
    // Buscar propuestas disponibles
    const proposals = await prisma.timeSlot.findMany({
      where: { courtId: null },
      include: {
        instructor: { include: { user: true } },
        bookings: {
          where: { status: { in: ['PENDING', 'CONFIRMED'] } }
        }
      },
      take: 3
    });
    
    if (proposals.length === 0) {
      console.log('❌ No hay propuestas disponibles');
      await prisma.$disconnect();
      return;
    }
    
    console.log(`✅ Encontradas ${proposals.length} propuestas\n`);
    
    // Tomar la primera propuesta para probar
    const testProposal = proposals[0];
    const clubId = testProposal.clubId;
    const start = new Date(testProposal.start).toISOString();
    
    console.log('📋 Propuesta de prueba:');
    console.log(`  - ID: ${testProposal.id}`);
    console.log(`  - Club: ${clubId}`);
    console.log(`  - Fecha: ${start}`);
    console.log(`  - Nivel: ${testProposal.level}`);
    console.log(`  - Bookings: ${testProposal.bookings.length}`);
    
    await prisma.$disconnect();
    
    // Probar endpoint SIN nivel de usuario
    console.log('\n\n🌐 TEST 1: Sin nivel de usuario');
    const url1 = `http://localhost:9002/api/timeslots/proposals?clubId=${clubId}&start=${encodeURIComponent(start)}`;
    console.log(`URL: ${url1}`);
    
    const response1 = await fetch(url1);
    const data1 = await response1.json();
    
    console.log(`✅ Respuesta: ${data1.total} propuestas`);
    data1.proposals?.forEach((p, i) => {
      console.log(`  ${i + 1}. ID: ${p.id.substring(0, 10)}... - Nivel: ${p.level} - Bookings: ${p.bookings.length}`);
    });
    
    // Probar endpoint CON nivel de usuario (intermedio)
    console.log('\n\n🌐 TEST 2: Con nivel "intermedio"');
    const url2 = `http://localhost:9002/api/timeslots/proposals?clubId=${clubId}&start=${encodeURIComponent(start)}&userLevel=intermedio`;
    console.log(`URL: ${url2}`);
    
    const response2 = await fetch(url2);
    const data2 = await response2.json();
    
    console.log(`✅ Respuesta: ${data2.total} propuestas filtradas`);
    data2.proposals?.forEach((p, i) => {
      console.log(`  ${i + 1}. ID: ${p.id.substring(0, 10)}... - Nivel: ${p.level} - Bookings: ${p.bookings.length}`);
    });
    
    // Probar endpoint CON nivel de usuario (principiante)
    console.log('\n\n🌐 TEST 3: Con nivel "principiante"');
    const url3 = `http://localhost:9002/api/timeslots/proposals?clubId=${clubId}&start=${encodeURIComponent(start)}&userLevel=principiante`;
    console.log(`URL: ${url3}`);
    
    const response3 = await fetch(url3);
    const data3 = await response3.json();
    
    console.log(`✅ Respuesta: ${data3.total} propuestas filtradas`);
    data3.proposals?.forEach((p, i) => {
      console.log(`  ${i + 1}. ID: ${p.id.substring(0, 10)}... - Nivel: ${p.level} - Bookings: ${p.bookings.length}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testProposalsEndpoint();
