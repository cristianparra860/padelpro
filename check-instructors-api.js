const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./prisma/dev.db', (err) => {
  if (err) {
    console.error('❌ Error conectando a la base de datos:', err);
    process.exit(1);
  }
  console.log('✅ Conectado a la base de datos');
});

console.log('\n📊 Consultando TODOS los instructores activos:\n');

db.all(`
  SELECT 
    i.id,
    i.userId,
    i.clubId,
    i.name,
    i.isActive,
    u.name as userName,
    u.email
  FROM Instructor i
  LEFT JOIN User u ON i.userId = u.id
  WHERE i.isActive = 1
  ORDER BY i.name ASC
`, [], (err, rows) => {
  if (err) {
    console.error('❌ Error:', err);
    db.close();
    process.exit(1);
  }

  console.log(`Total instructores activos: ${rows.length}\n`);
  
  rows.forEach((row, index) => {
    console.log(`${index + 1}. ${row.name || row.userName || 'Sin nombre'}`);
    console.log(`   ID: ${row.id}`);
    console.log(`   Email: ${row.email || 'N/A'}`);
    console.log(`   Club: ${row.clubId}`);
    console.log('');
  });

  db.close();
});
