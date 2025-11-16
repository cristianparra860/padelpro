// Replicate calendar route logic to find serialization or data issues
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const startDate = new Date();
  const endDate = new Date(Date.now() + 30*24*60*60*1000);
  startDate.setHours(0,0,0,0);
  endDate.setDate(endDate.getDate()+1);
  endDate.setHours(23,59,59,999);
  const startISO = startDate.toISOString();
  const endISO = endDate.toISOString();
  const sql = `SELECT id, start, end, maxPlayers, totalPrice, level, category, courtId, courtNumber, instructorId, clubId FROM TimeSlot WHERE ((start >= ? AND start <= ?) OR (CAST(start AS INTEGER) >= ? AND CAST(start AS INTEGER) <= ?)) ORDER BY start ASC`;
  try {
    const rows = await prisma.$queryRawUnsafe(sql, startISO, endISO, startDate.getTime(), endDate.getTime());
    const instructorIds = Array.from(new Set(rows.filter(r=>r.instructorId).map(r=>r.instructorId)));
    const [instructorsBatch, bookingsBatch, matches] = await Promise.all([
      instructorIds.length ? prisma.instructor.findMany({ where: { id: { in: instructorIds } }, include: { user: { select: { name:true, profilePictureUrl:true } } } }) : Promise.resolve([]),
      prisma.booking.findMany({ where: { timeSlotId: { in: rows.map(r=>r.id) }, status: { not: 'CANCELLED' } }, include: { user: { select: { name:true, profilePictureUrl:true } } } }),
      prisma.match.findMany({ where: { startTime: { gte: startDate, lte: endDate } }, include: { court: true }, orderBy: { startTime: 'asc' } })
    ]);
    const instructorMap = new Map(instructorsBatch.map(i=>[i.id,i]));
    const bookingsMap = new Map();
    for (const b of bookingsBatch) { const arr = bookingsMap.get(b.timeSlotId)||[]; arr.push(b); bookingsMap.set(b.timeSlotId, arr); }
    const classes = rows.map(r => ({ ...r, instructor: r.instructorId ? instructorMap.get(r.instructorId)||null : null, bookings: bookingsMap.get(r.id)||[] }));
    const proposedClasses = classes.filter(c=>c.courtNumber===null);
    const confirmedClasses = classes.filter(c=>c.courtNumber!==null);
    const calendarData = { proposedClasses: proposedClasses.length, confirmedClasses: confirmedClasses.length, events: classes.length + matches.length };
    console.log('Calendar summary:', calendarData);
    JSON.stringify(calendarData); // test serialization
    console.log('Serialization OK');
  } catch (e) {
    console.error('Failure building calendar data:', e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
