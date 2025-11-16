const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkProposals() {
  // Verificar propuestas del 28 de octubre
  const date = '2025-10-28';
  const startOfDay = new Date(date + 'T00:00:00.000Z');
  const endOfDay = new Date(date + 'T23:59:59.999Z');
  
  const startTimestamp = startOfDay.getTime();
  const endTimestamp = endOfDay.getTime();
  
  console.log('🔍 Buscando clases del 28/10/2025');
  console.log('Start timestamp:', startTimestamp, '=', startOfDay.toISOString());
  console.log('End timestamp:', endTimestamp, '=', endOfDay.toISOString());
  
  const query = `SELECT * FROM TimeSlot WHERE clubId = ? AND start >= ? AND start <= ? ORDER BY start ASC`;
  const results = await prisma.$queryRawUnsafe(query, 'club-1', startTimestamp, endTimestamp);
  
  console.log('\n📊 Resultados:', results.length);
  console.log('Con courtId:', results.filter(s => s.courtId).length);
  console.log('Sin courtId (propuestas):', results.filter(s => !s.courtId).length);
  
  console.log('\nPrimeras 10:');
  results.slice(0, 10).forEach(s => {
    const start = new Date(s.start);
    console.log('  -', start.toISOString(), s.courtId ? '✅' : '⏳', s.instructorId);
  });
  
  process.exit();
}

checkProposals();
