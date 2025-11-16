const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./prisma/dev.db', (err) => {
  if (err) {
    console.error('❌ Error conectando:', err);
    process.exit(1);
  }
});

console.log('\n🔍 Buscando usuario Alex García...\n');

db.get(`
  SELECT id, name, email, gender, level, credits
  FROM User
  WHERE email = 'alex@example.com'
`, [], (err, row) => {
  if (err) {
    console.error('❌ Error:', err);
  } else if (row) {
    console.log('✅ Usuario encontrado:');
    console.log(JSON.stringify(row, null, 2));
  } else {
    console.log('❌ Usuario NO encontrado');
  }
  
  db.close();
});
