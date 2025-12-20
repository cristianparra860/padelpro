const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./prisma/dev.db');

console.log('🔍 Verificando clases generadas (ts-future-*)...\n');

db.all(
  `SELECT id, courtNumber, hasRecycledSlots, availableRecycledSlots, datetime(start/1000, 'unixepoch') as time 
   FROM TimeSlot 
   WHERE id LIKE 'ts-future-%' 
   ORDER BY start`,
  [],
  (err, rows) => {
    if (err) console.error(err);
    else console.log(JSON.stringify(rows, null, 2));
    db.close();
  }
);
