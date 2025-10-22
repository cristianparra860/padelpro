const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'prisma', 'prisma', 'dev.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Buscando clases sin pista asignada...\n');

db.all(`
  SELECT 
    ts.id,
    ts.start,
    ts.end,
    ts.maxPlayers,
    ts.courtNumber,
    ts.level,
    c.name as clubName,
    (SELECT COUNT(*) FROM Booking WHERE timeSlotId = ts.id) as bookingsCount
  FROM TimeSlot ts
  LEFT JOIN Club c ON ts.clubId = c.id
  WHERE ts.courtNumber IS NULL
  AND ts.start >= datetime('now')
  ORDER BY ts.start
  LIMIT 10
`, (err, slots) => {
  if (err) {
    console.error('❌ Error:', err);
    db.close();
    return;
  }

  console.log(`Encontradas ${slots.length} clases sin pista asignada:\n`);
  
  slots.forEach((slot, index) => {
    const date = new Date(slot.start);
    console.log(`${index + 1}. ID: ${slot.id.substring(0, 25)}...`);
    console.log(`   📅 ${date.toLocaleDateString('es-ES')} ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`);
    console.log(`   👥 ${slot.bookingsCount}/${slot.maxPlayers} jugadores`);
    console.log(`   🏢 ${slot.clubName}`);
    console.log(`   📊 Nivel: ${slot.level}`);
    console.log('');
  });

  db.close();
});
