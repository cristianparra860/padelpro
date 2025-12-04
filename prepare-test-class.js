const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Vamos a resetear una clase para que esté completamente vacía
  const testSlotId = 'ts-1764308191576-ckdaeugsvsh'; // David Collado, 9:00 AM
  
  console.log('\n🔧 Preparando clase para prueba de primera reserva...\n');
  
  // Resetear la clase a estado inicial
  await prisma.$executeRaw`
    UPDATE TimeSlot 
    SET level = '', 
        genderCategory = NULL, 
        levelRange = NULL
    WHERE id = ${testSlotId}
  `;
  
  // Verificar que no tiene reservas
  const bookings = await prisma.$queryRaw`
    SELECT * FROM Booking WHERE timeSlotId = ${testSlotId}
  `;
  
  // Obtener info de la clase
  const slot = await prisma.$queryRaw`
    SELECT 
      ts.*,
      i.name as instructorName,
      i.levelRanges
    FROM TimeSlot ts
    LEFT JOIN Instructor i ON i.id = ts.instructorId
    WHERE ts.id = ${testSlotId}
  `;
  
  const slotData = slot[0];
  const date = new Date(Number(slotData.start));
  const ranges = JSON.parse(slotData.levelRanges);
  
  console.log('✅ Clase preparada para prueba:\n');
  console.log(`🎾 ID: ${slotData.id}`);
  console.log(`   Hora: ${date.toLocaleString('es-ES')}`);
  console.log(`   Instructor: ${slotData.instructorName}`);
  console.log(`   Level: "${slotData.level}" (VACÍO ✓)`);
  console.log(`   Gender: ${slotData.genderCategory} (NULL ✓)`);
  console.log(`   LevelRange: ${slotData.levelRange} (NULL ✓)`);
  console.log(`   Reservas actuales: ${bookings.length}`);
  console.log(`   Rangos del instructor: ${ranges.map(r => `${r.minLevel}-${r.maxLevel}`).join(', ')}`);
  
  console.log('\n📝 PASOS PARA LA PRUEBA:\n');
  console.log('1. Abre http://localhost:9002 en el navegador');
  console.log('2. Inicia sesión con un usuario (recomendado: Marc Parra, nivel avanzado = 5.0+)');
  console.log('3. Busca la clase del 4/12/2025 a las 9:00 con David Collado');
  console.log('4. Haz clic en "Reservar" y completa la primera reserva');
  console.log('5. Observa la consola del servidor para ver los logs del proceso');
  console.log('\n🔍 VERIFICAR QUE:');
  console.log('   - En la consola aparezca "🏷️ FIRST BOOKING DETECTED"');
  console.log('   - Se muestre "Usuario nivel: X"');
  console.log('   - Se asigne el rango correspondiente (ej: 5-7 para nivel avanzado)');
  console.log('   - La tarjeta de la clase se actualice mostrando el rango');
  console.log('\n🔧 DESPUÉS DE LA RESERVA, ejecuta este comando para verificar:');
  console.log(`   node -e "const {PrismaClient} = require('@prisma/client'); const p = new PrismaClient(); p.$queryRaw\\\`SELECT level, levelRange, genderCategory FROM TimeSlot WHERE id='${testSlotId}'\\\`.then(r => {console.log(r); p.$disconnect();})"`);
  
  await prisma.$disconnect();
}

main().catch(console.error);
