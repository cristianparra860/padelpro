const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'prisma', 'prisma', 'dev.db');
const db = new sqlite3.Database(dbPath);

// Primero, eliminar TODAS las propuestas de octubre (courtId = NULL)
db.run(`
  DELETE FROM TimeSlot 
  WHERE courtId IS NULL 
    AND date(start) >= '2025-10-01' 
    AND date(start) <= '2025-10-31'
`, function(err) {
  if (err) {
    console.error('❌ Error al limpiar propuestas:', err);
    db.close();
    return;
  }
  
  console.log(`🗑️  Eliminadas ${this.changes} propuestas antiguas`);
  
  // Obtener IDs de instructores
  db.all('SELECT id FROM Instructor ORDER BY id', [], (err, instructors) => {
    if (err) {
      console.error('❌ Error al obtener instructores:', err);
      db.close();
      return;
    }

    console.log(`\n👨‍🏫 Instructores encontrados: ${instructors.length}`);
    instructors.forEach((inst, i) => console.log(`   ${i + 1}. ${inst.id}`));

    const proposals = [];
    let id = 1;

    // Generar propuestas para TODOS los días de octubre (1-31)
    for (let day = 1; day <= 31; day++) {
      const dateStr = `2025-10-${String(day).padStart(2, '0')}`;
      
      // Para cada hora de 08:00 a 21:30 (cada 30 minutos)
      for (let hour = 8; hour < 22; hour++) {
        for (let minute of [0, 30]) {
          // Saltar 21:30 y después
          if (hour === 21 && minute === 30) break;
          
          const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
          const startDateTime = `${dateStr} ${timeStr}:00`;
          
          // Calcular hora de fin (+90 minutos)
          let endHour = hour;
          let endMinute = minute + 90;
          if (endMinute >= 60) {
            endHour += Math.floor(endMinute / 60);
            endMinute = endMinute % 60;
          }
          const endTimeStr = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
          const endDateTime = `${dateStr} ${endTimeStr}:00`;
          
          // Crear propuesta para CADA instructor
          instructors.forEach((instructor) => {
            proposals.push({
              id: `timeslot-${id++}`,
              start: startDateTime,
              end: endDateTime,
              instructorId: instructor.id,
              courtId: null, // NULL = propuesta
              courtNumber: null,
              maxPlayers: 4,
              totalPrice: 25.0,
              level: 'INTERMEDIATE',
              category: 'ADULTS'
            });
          });
        }
      }
    }

    console.log(`\n📊 Propuestas a insertar: ${proposals.length}`);
    console.log(`   Por día: ${proposals.length / 31}`);
    console.log(`   Por instructor: ${proposals.length / instructors.length}`);
    
    // Insertar en lotes
    const stmt = db.prepare(`
      INSERT INTO TimeSlot (id, start, end, maxPlayers, totalPrice, level, category, courtId, courtNumber, instructorId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let inserted = 0;
    proposals.forEach((p, index) => {
      stmt.run([
        p.id, p.start, p.end, p.maxPlayers, p.totalPrice,
        p.level, p.category, p.courtId, p.courtNumber, p.instructorId
      ], (err) => {
        if (err) {
          console.error(`❌ Error en propuesta ${index + 1}:`, err.message);
        } else {
          inserted++;
        }
        
        if (index === proposals.length - 1) {
          stmt.finalize();
          console.log(`\n✅ Insertadas ${inserted} propuestas exitosamente!`);
          
          // Verificar
          db.get(`
            SELECT COUNT(*) as total 
            FROM TimeSlot 
            WHERE courtId IS NULL 
              AND date(start) >= '2025-10-01' 
              AND date(start) <= '2025-10-31'
          `, (err, row) => {
            if (!err) {
              console.log(`\n🔍 Verificación: ${row.total} propuestas en octubre`);
            }
            db.close();
          });
        }
      });
    });
  });
});
