const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./prisma/dev.db', (err) => {
  if (err) {
    console.error('❌ Error conectando:', err.message);
    process.exit(1);
  }
  console.log('✅ Conectado a prisma/dev.db');
});

db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name", [], (err, rows) => {
  if (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
  console.log(`\n📊 Total tablas: ${rows.length}`);
  if (rows.length > 0) {
    console.log('\n📋 Tablas encontradas:');
    rows.forEach((row, i) => console.log(`  ${i + 1}. ${row.name}`));
  } else {
    console.log('\n⚠️ La base de datos está vacía o corrupta');
  }
  db.close();
});
