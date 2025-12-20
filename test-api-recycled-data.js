// test-api-recycled-data.js
// Verifica que la API de timeslots devuelva correctamente los datos de reciclaje

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testRecycledData() {
  try {
    console.log('\n🔍 VERIFICANDO DATOS DE RECICLAJE EN API\n');
    console.log('=' .repeat(60));

    const url = 'http://localhost:9002/api/timeslots?clubId=padel-estrella-madrid&date=2025-12-28';
    console.log(`📡 Llamando a: ${url}\n`);

    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`❌ Error HTTP: ${response.status} ${response.statusText}`);
      return;
    }

    const data = await response.json();
    console.log(`✅ Respuesta recibida: ${data.length} slots\n`);

    // Buscar slots con datos de reciclaje
    const recycledSlots = data.filter(slot => slot.hasRecycledSlots === true);

    console.log(`♻️ Slots con datos de reciclaje: ${recycledSlots.length}\n`);

    if (recycledSlots.length === 0) {
      console.log('⚠️ NO SE ENCONTRARON SLOTS CON DATOS DE RECICLAJE');
      console.log('\n📋 Muestra de los primeros 3 slots:');
      data.slice(0, 3).forEach((slot, i) => {
        console.log(`\n  Slot ${i + 1}:`);
        console.log(`    ID: ${slot.id.substring(0, 20)}...`);
        console.log(`    Instructor: ${slot.instructorName}`);
        console.log(`    Court: ${slot.courtNumber}`);
        console.log(`    hasRecycledSlots: ${slot.hasRecycledSlots}`);
        console.log(`    availableRecycledSlots: ${slot.availableRecycledSlots}`);
        console.log(`    Bookings: ${slot.bookings?.length || 0}`);
        if (slot.bookings && slot.bookings.length > 0) {
          slot.bookings.forEach(b => {
            console.log(`      - ${b.name}: ${b.status}, isRecycled=${b.isRecycled}, size=${b.groupSize}`);
          });
        }
      });
    } else {
      console.log('✅ SLOTS CON RECICLAJE ENCONTRADOS:\n');
      recycledSlots.forEach((slot, i) => {
        console.log(`  ${i + 1}. ${slot.instructorName} - Pista ${slot.courtNumber}`);
        console.log(`     📊 hasRecycledSlots: ${slot.hasRecycledSlots}`);
        console.log(`     📊 availableRecycledSlots: ${slot.availableRecycledSlots}`);
        console.log(`     📊 recycledSlotsOnlyPoints: ${slot.recycledSlotsOnlyPoints}`);
        console.log(`     📊 Bookings totales: ${slot.bookings?.length || 0}`);
        
        if (slot.bookings && slot.bookings.length > 0) {
          const recycledBookings = slot.bookings.filter(b => b.isRecycled);
          console.log(`     ♻️ Bookings reciclados: ${recycledBookings.length}`);
          recycledBookings.forEach(b => {
            console.log(`        - ${b.name}: status=${b.status}, groupSize=${b.groupSize}`);
          });
        }
        console.log('');
      });
    }

    console.log('=' .repeat(60));
    console.log('\n✅ Verificación completada\n');

  } catch (error) {
    console.error('\n❌ Error en la prueba:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('   → Asegúrate de que el servidor esté ejecutándose en puerto 9002');
      console.error('   → Ejecuta: npm run dev');
    }
  }
}

testRecycledData();
