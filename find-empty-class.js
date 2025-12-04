const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('\n🔍 Buscando clases COMPLETAMENTE VACÍAS (0 reservas)...\n');
  
  const now = Date.now();
  const emptySlots = await prisma.$queryRaw`
    SELECT 
      ts.id,
      ts.start,
      ts.level,
      ts.genderCategory,
      ts.levelRange,
      ts.instructorId,
      i.name as instructorName,
      i.levelRanges as instructorRanges
    FROM TimeSlot ts
    LEFT JOIN Instructor i ON i.id = ts.instructorId
    WHERE ts.courtId IS NULL 
      AND ts.start > ${now}
      AND ts.id NOT IN (SELECT DISTINCT timeSlotId FROM Booking WHERE timeSlotId IS NOT NULL)
    ORDER BY ts.start ASC
    LIMIT 5
  `;

  console.log(`✅ Encontradas ${emptySlots.length} clases sin ninguna reserva:\n`);
  
  if (emptySlots.length === 0) {
    console.log('⚠️ No hay clases vacías. Vamos a crear una para la prueba...\n');
    
    // Crear una clase vacía para prueba
    const tomorrow = Date.now() + (24 * 60 * 60 * 1000);
    const testTime = new Date(tomorrow);
    testTime.setHours(10, 0, 0, 0);
    
    const instructors = await prisma.$queryRaw`SELECT id, name FROM Instructor LIMIT 1`;
    const clubId = 'padel-estrella-malaga';
    
    const newSlotId = `test-slot-${Date.now()}`;
    await prisma.$executeRaw`
      INSERT INTO TimeSlot (id, start, instructorId, clubId)
      VALUES (${newSlotId}, ${testTime.getTime()}, ${instructors[0].id}, ${clubId})
    `;
    
    console.log(`✅ Clase de prueba creada:`);
    console.log(`   ID: ${newSlotId}`);
    console.log(`   Hora: ${testTime.toLocaleString('es-ES')}`);
    console.log(`   Instructor: ${instructors[0].name}`);
    console.log(`   Level: VACÍO (sin asignar)`);
    console.log(`   Gender: NULL`);
    console.log(`   Reservas: 0\n`);
    
    return;
  }

  emptySlots.forEach((slot, i) => {
    const date = new Date(Number(slot.start));
    console.log(`${i + 1}. 🎾 ID: ${slot.id}`);
    console.log(`   Hora: ${date.toLocaleString('es-ES')}`);
    console.log(`   Instructor: ${slot.instructorName}`);
    console.log(`   Level actual: "${slot.level || 'VACÍO'}"`);
    console.log(`   Gender: ${slot.genderCategory || 'NULL'}`);
    console.log(`   LevelRange: ${slot.levelRange || 'NULL'}`);
    
    if (slot.instructorRanges) {
      const ranges = JSON.parse(slot.instructorRanges);
      console.log(`   Rangos instructor: ${ranges.map(r => `${r.minLevel}-${r.maxLevel}`).join(', ')}`);
    }
    console.log('');
  });

  console.log('\n📝 INSTRUCCIONES PARA LA PRUEBA:');
  console.log('1. Copia el ID de una de las clases de arriba');
  console.log('2. Ve a http://localhost:9002');
  console.log('3. Inicia sesión con un usuario que tenga nivel definido');
  console.log('4. Busca la clase por ID o fecha');
  console.log('5. Haz la primera reserva');
  console.log('6. Verifica que el Level se actualice con el rango correspondiente\n');

  await prisma.$disconnect();
}

main().catch(console.error);
