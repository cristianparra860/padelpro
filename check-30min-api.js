const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'prisma', 'prisma', 'dev.db');
const db = new sqlite3.Database(dbPath);

// Verificar propuestas para el 21 de octubre con minutos :30
db.all(`
  SELECT 
    id,
    datetime(start) as start_time,
    courtId,
    instructorId
  FROM TimeSlot
  WHERE date(start) = '2025-10-21'
    AND courtId IS NULL
    AND strftime('%M', start) = '30'
  ORDER BY start ASC
  LIMIT 10
`, [], (err, rows) => {
  if (err) {
    console.error('❌ Error:', err);
    db.close();
    return;
  }

  console.log('\n🔍 Propuestas con minutos :30 para Oct 21:');
  console.log(`Total encontradas: ${rows.length}`);
  
  rows.forEach((row, index) => {
    console.log(`\n${index + 1}. ID: ${row.id}`);
    console.log(`   Hora: ${row.start_time}`);
    console.log(`   courtId: ${row.courtId}`);
    console.log(`   instructorId: ${row.instructorId}`);
  });

  // Verificar todas las propuestas del 21
  db.all(`
    SELECT 
      strftime('%H:%M', start) as time_slot,
      COUNT(*) as count
    FROM TimeSlot
    WHERE date(start) = '2025-10-21'
      AND courtId IS NULL
    GROUP BY strftime('%H:%M', start)
    ORDER BY time_slot
  `, [], (err, distribution) => {
    if (err) {
      console.error('❌ Error:', err);
      db.close();
      return;
    }

    console.log('\n📊 Distribución de propuestas por hora (Oct 21):');
    distribution.forEach(slot => {
      const icon = slot.time_slot.endsWith(':30') ? '🟠' : '🔵';
      console.log(`${icon} ${slot.time_slot} -> ${slot.count} propuestas`);
    });

    db.close();
  });
});
