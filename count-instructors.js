const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./prisma/prisma/dev.db');

db.get(`SELECT COUNT(*) as total FROM Instructor WHERE isActive = 1`, [], (err, row) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Total instructores activos:', row.total);
  }
  db.close();
});
