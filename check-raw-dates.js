const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRawDates() {
  const result = await prisma.$queryRawUnsafe('SELECT id, start, typeof(start) as type, date(start/1000, "unixepoch") as date_str FROM TimeSlot WHERE courtId IS NULL LIMIT 10');
  console.log('Valores raw de propuestas:');
  result.forEach(s => {
    console.log('  ID:', s.id);
    console.log('    start:', s.start);
    console.log('    tipo:', s.type);
    console.log('    fecha:', s.date_str);
    console.log('    Date obj:', new Date(s.start).toISOString());
    console.log('');
  });
  process.exit();
}

checkRawDates();
