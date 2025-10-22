const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'prisma', 'prisma', 'dev.db');
console.log('📂 Database:', dbPath);

const db = new Database(dbPath);

try {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('\n📊 Tablas en la base de datos:');
  tables.forEach(t => console.log(`  - ${t.name}`));
  
  if (tables.length === 0) {
    console.log('\n❌ La base de datos está VACÍA!');
  }
  
} catch (error) {
  console.error('❌ Error:', error.message);
} finally {
  db.close();
}
