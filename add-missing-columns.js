const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'prisma', 'prisma', 'dev.db');
const db = new Database(dbPath);

try {
  console.log('📊 Agregando columnas faltantes...');
  
  // Agregar courtNumber a TimeSlot
  try {
    db.exec('ALTER TABLE TimeSlot ADD COLUMN courtNumber INTEGER DEFAULT NULL');
    console.log('✅ Columna courtNumber agregada a TimeSlot');
  } catch (e) {
    if (e.message.includes('duplicate column name')) {
      console.log('ℹ️  Columna courtNumber ya existe en TimeSlot');
    } else {
      throw e;
    }
  }
  
  // Agregar groupSize a Booking
  try {
    db.exec('ALTER TABLE Booking ADD COLUMN groupSize INTEGER DEFAULT 1');
    console.log('✅ Columna groupSize agregada a Booking');
  } catch (e) {
    if (e.message.includes('duplicate column name')) {
      console.log('ℹ️  Columna groupSize ya existe en Booking');
    } else {
      throw e;
    }
  }
  
  console.log('\n🎉 ¡Columnas agregadas exitosamente!');
  
} catch (error) {
  console.error('❌ Error:', error);
} finally {
  db.close();
}
