const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./prisma/dev.db', (err) => {
  if (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
});

console.log('📋 Listando todas las tablas:\n');

db.all(`
  SELECT name FROM sqlite_master 
  WHERE type='table' 
  ORDER BY name
`, [], (err, rows) => {
  if (err) {
    console.error('❌ Error:', err);
    db.close();
    process.exit(1);
  }

  console.log(`Total tablas: ${rows.length}\n`);
  rows.forEach((row, i) => {
    console.log(`${i + 1}. ${row.name}`);
  });

  db.close();
});
