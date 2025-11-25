const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTimeSlotFormat() {
  try {
    console.log('📊 Verificando formato de TimeSlots...\n');
    
    // Obtener slots sin pista (propuestas)
    const proposals = await prisma.$queryRaw`
      SELECT id, start, end, instructorId, courtId, courtNumber
      FROM TimeSlot 
      WHERE courtId IS NULL 
      ORDER BY start 
      LIMIT 10
    `;
    
    console.log('🔶 PROPUESTAS (sin pista asignada):');
    proposals.forEach((slot, idx) => {
      console.log(`   ${idx + 1}. ID: ${slot.id.substring(0, 20)}...`);
      console.log(`      Start: ${slot.start} (tipo: ${typeof slot.start})`);
      console.log(`      End: ${slot.end} (tipo: ${typeof slot.end})`);
      console.log(`      Duración: ${new Date(slot.end) - new Date(slot.start)}ms`);
      console.log('');
    });
    
    // Obtener slots con pista (confirmadas)
    const confirmed = await prisma.$queryRaw`
      SELECT id, start, end, instructorId, courtId, courtNumber
      FROM TimeSlot 
      WHERE courtId IS NOT NULL 
      ORDER BY start 
      LIMIT 5
    `;
    
    console.log('✅ CONFIRMADAS (con pista asignada):');
    confirmed.forEach((slot, idx) => {
      console.log(`   ${idx + 1}. ID: ${slot.id.substring(0, 20)}...`);
      console.log(`      Start: ${slot.start} (tipo: ${typeof slot.start})`);
      console.log(`      End: ${slot.end} (tipo: ${typeof slot.end})`);
      console.log(`      Pista: ${slot.courtNumber}`);
      console.log(`      Duración: ${new Date(slot.end) - new Date(slot.start)}ms`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTimeSlotFormat();
