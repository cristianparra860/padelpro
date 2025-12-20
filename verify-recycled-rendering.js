// verify-recycled-rendering.js
// Verificar que los datos lleguen correctamente al frontend

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function verifyRecycledRendering() {
  console.log('\n🔍 VERIFICACIÓN COMPLETA DEL SISTEMA DE RECICLAJE\n');
  console.log('='.repeat(70));

  try {
    // 1. Verificar API de timeslots
    console.log('\n📡 PASO 1: Verificar API /timeslots');
    const apiUrl = 'http://localhost:9002/api/timeslots?clubId=padel-estrella-madrid&date=2025-12-28';
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      console.error(`❌ Error HTTP: ${response.status}`);
      return;
    }

    const slots = await response.json();
    console.log(`✅ API devolvió ${slots.length} slots`);

    // Buscar slots con reciclaje
    const recycledSlots = slots.filter(s => s.hasRecycledSlots === true);
    console.log(`\n♻️ Slots con reciclaje: ${recycledSlots.length}`);

    if (recycledSlots.length === 0) {
      console.log('❌ NO HAY SLOTS CON RECICLAJE - PROBLEMA EN LA API');
      return;
    }

    // Analizar el primer slot reciclado
    const slot = recycledSlots[0];
    console.log('\n📊 ANÁLISIS DEL SLOT RECICLADO:');
    console.log(`   ID: ${slot.id.substring(0, 20)}...`);
    console.log(`   Instructor: ${slot.instructorName}`);
    console.log(`   Pista: ${slot.courtNumber}`);
    console.log(`   hasRecycledSlots: ${slot.hasRecycledSlots}`);
    console.log(`   availableRecycledSlots: ${slot.availableRecycledSlots}`);
    console.log(`   recycledSlotsOnlyPoints: ${slot.recycledSlotsOnlyPoints}`);
    console.log(`   Bookings totales: ${slot.bookings?.length || 0}`);

    // Analizar bookings
    if (slot.bookings && slot.bookings.length > 0) {
      console.log('\n📋 BOOKINGS:');
      slot.bookings.forEach((b, i) => {
        console.log(`   ${i + 1}. ${b.name || b.userName}`);
        console.log(`      - Status: ${b.status}`);
        console.log(`      - isRecycled: ${b.isRecycled}`);
        console.log(`      - groupSize: ${b.groupSize}`);
      });

      // Verificar si hay bookings reciclados
      const recycledBookings = slot.bookings.filter(b => 
        b.status === 'CANCELLED' && b.isRecycled === true
      );
      
      console.log(`\n♻️ Bookings reciclados: ${recycledBookings.length}`);
      
      if (recycledBookings.length > 0) {
        const groupSize = recycledBookings[0].groupSize;
        console.log(`   → Modalidad reciclada: ${groupSize} jugadores`);
        
        // Calcular índices esperados
        const startIndex = [1,2,3,4].slice(0, groupSize - 1).reduce((sum, p) => sum + p, 0);
        const endIndex = startIndex + groupSize;
        console.log(`   → Índices esperados: ${startIndex} a ${endIndex - 1}`);
        console.log(`   → Estos ${groupSize} círculos deberían ser AMARILLOS`);
      }
    }

    // 2. Verificar que los datos necesarios estén presentes
    console.log('\n✅ VERIFICACIÓN DE DATOS:');
    const hasAllData = 
      slot.hasRecycledSlots === true &&
      slot.availableRecycledSlots > 0 &&
      slot.bookings && 
      slot.bookings.some(b => b.status === 'CANCELLED' && b.isRecycled === true);
    
    if (hasAllData) {
      console.log('   ✅ Todos los datos necesarios están presentes');
      console.log('   ✅ La API devuelve la información correcta');
      console.log('\n🎯 PRÓXIMO PASO:');
      console.log('   El componente ClassCardReal debe:');
      console.log('   1. Recibir estos datos via classData props');
      console.log('   2. Calcular effectiveCreditsSlots incluyendo índices reciclados');
      console.log('   3. Mostrar círculos amarillos con borde grueso');
      console.log('   4. Mostrar icono 🎁 y texto con puntos');
    } else {
      console.log('   ❌ FALTAN DATOS - Revisar API');
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ Verificación completada\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('   → Servidor no está corriendo en puerto 9002');
      console.error('   → Ejecuta: npm run dev');
    }
  }
}

verifyRecycledRendering();
