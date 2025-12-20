const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./prisma/dev.db');

console.log('🔍 Verificando datos de plazas recicladas en DB para el 9 de diciembre...\n');

const query = `
  SELECT 
    id,
    instructorId,
    start,
    courtNumber,
    hasRecycledSlots,
    availableRecycledSlots,
    recycledSlotsOnlyPoints,
    creditsCost
  FROM TimeSlot 
  WHERE date(start/1000, 'unixepoch') = '2025-12-09' 
    AND courtNumber IS NOT NULL
  ORDER BY start
`;

db.all(query, [], (err, rows) => {
  if (err) {
    console.error('❌ Error:', err);
    db.close();
    return;
  }
  
  console.log(`📊 Total de clases encontradas: ${rows.length}\n`);
  
  rows.forEach(row => {
    const date = new Date(row.start);
    console.log(`⏰ ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - Pista ${row.courtNumber}`);
    console.log(`   ID: ${row.id.substring(0, 20)}...`);
    console.log(`   Instructor: ${row.instructorId}`);
    console.log(`   hasRecycledSlots: ${row.hasRecycledSlots}`);
    console.log(`   availableRecycledSlots: ${row.availableRecycledSlots}`);
    console.log(`   recycledSlotsOnlyPoints: ${row.recycledSlotsOnlyPoints}`);
    console.log(`   creditsCost: ${row.creditsCost}`);
    console.log('');
  });
  
  const withRecycled = rows.filter(r => r.hasRecycledSlots && r.availableRecycledSlots > 0);
  console.log(`\n✅ Clases con plazas recicladas: ${withRecycled.length}`);
  
  db.close();
});
