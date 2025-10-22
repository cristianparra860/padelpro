const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'prisma', 'prisma', 'dev.db');
console.log('📂 Conectando a:', dbPath);

const db = new Database(dbPath);

try {
  console.log('\n📊 Agregando columna courtNumber...');
  db.exec('ALTER TABLE TimeSlot ADD COLUMN courtNumber INTEGER DEFAULT NULL');
  console.log('✅ Columna courtNumber agregada!');
  
  console.log('\n📊 Agregando columna groupSize...');
  db.exec('ALTER TABLE Booking ADD COLUMN groupSize INTEGER DEFAULT 1');
  console.log('✅ Columna groupSize agregada!');
  
  console.log('\n🎉 ¡Listo! Las columnas fueron agregadas exitosamente.');
  
} catch (error) {
  if (error.message.includes('duplicate column')) {
    console.log('ℹ️  Las columnas ya existen');
  } else {
    console.error('❌ Error:', error.message);
  }
} finally {
  db.close();
}
