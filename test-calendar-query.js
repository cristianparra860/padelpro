// Simple one-off Prisma client for diagnostic script
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const now = new Date();
  const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  now.setHours(0,0,0,0);
  future.setDate(future.getDate() + 1);
  future.setHours(23,59,59,999);
  const startISO = now.toISOString();
  const endISO = future.toISOString();
  console.log('Range:', startISO, 'to', endISO);
  try {
    const sql = `SELECT id, start, end, maxPlayers, totalPrice, level, category, courtId, courtNumber, instructorId, clubId FROM TimeSlot WHERE ((start >= ? AND start <= ?) OR (CAST(start AS INTEGER) >= ? AND CAST(start AS INTEGER) <= ?)) ORDER BY start ASC`;
    const rows = await prisma.$queryRawUnsafe(sql, startISO, endISO, now.getTime(), future.getTime());
    console.log('Rows:', rows.length);
    if (rows.length) {
      const sample = rows[0];
      console.log('Sample keys:', Object.keys(sample));
      console.log('start type/value:', typeof sample.start, sample.start);
      console.log('courtNumber:', sample.courtNumber);
    }
  } catch (e) {
    console.error('Raw query error:', e);
  } finally {
  await prisma.$disconnect();
  }
}

test();
