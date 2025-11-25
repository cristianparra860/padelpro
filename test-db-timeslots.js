// Test directo de la base de datos para ver qué está pasando
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testTimeslots() {
  try {
    console.log('🔍 Testing database queries...');
    
    const clubId = 'padel-estrella-madrid';
    const date = '2025-11-22';
    
    // Query 1: TimeSlots básicos
    console.log('\n1️⃣ Testing basic TimeSlot query...');
    const query = `SELECT * FROM TimeSlot WHERE clubId = ? AND start >= ? AND start <= ? ORDER BY start ASC`;
    const startISO = new Date(date + 'T00:00:00.000Z').toISOString();
    const endISO = new Date(date + 'T23:59:59.999Z').toISOString();
    
    console.log('Query:', query);
    console.log('Params:', [clubId, startISO, endISO]);
    
    const timeSlots = await prisma.$queryRawUnsafe(query, clubId, startISO, endISO);
    console.log('✅ TimeSlots found:', timeSlots.length);
    
    if (timeSlots.length === 0) {
      console.log('⚠️ No timeslots found, checking all timeslots...');
      const allSlots = await prisma.$queryRaw`SELECT COUNT(*) as count FROM TimeSlot`;
      console.log('Total timeslots in DB:', allSlots);
    }
    
    // Query 2: Confirmed classes
    console.log('\n2️⃣ Testing confirmed classes query...');
    const confirmedQuery = `
      SELECT 
        t.id,
        t.start,
        t.end,
        t.courtId,
        c.number as courtNumber
      FROM TimeSlot t
      LEFT JOIN Court c ON t.courtId = c.id
      WHERE t.clubId = ?
        AND t.start >= ? AND t.start <= ?
        AND t.courtId IS NOT NULL
      ORDER BY t.start
    `;
    
    const confirmedClasses = await prisma.$queryRawUnsafe(
      confirmedQuery,
      clubId,
      date + 'T00:00:00.000Z',
      date + 'T23:59:59.999Z'
    );
    console.log('✅ Confirmed classes found:', confirmedClasses.length);
    
    // Query 3: Courts
    console.log('\n3️⃣ Testing courts query...');
    const courts = await prisma.court.findMany({
      where: { 
        clubId: clubId,
        isActive: true 
      },
      orderBy: { number: 'asc' }
    });
    console.log('✅ Courts found:', courts.length);
    
    console.log('\n✅ All queries successful!');
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testTimeslots();
