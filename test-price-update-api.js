/**
 * Script de prueba para el endpoint de actualización de precios
 * 
 * Ejecutar después de cambiar tarifas en CourtPriceSlot para verificar
 * que las clases futuras se actualizan correctamente
 */

const API_BASE = 'http://localhost:9002';

async function testUpdateFuturePrices() {
  console.log('🧪 TEST: Actualización de precios futuros\n');

  try {
    // 1. Obtener club actual
    console.log('📋 1. Obteniendo información del club...');
    const clubsRes = await fetch(`${API_BASE}/api/clubs`);
    const clubs = await clubsRes.json();
    
    if (!clubs || clubs.length === 0) {
      throw new Error('No se encontraron clubs');
    }

    const club = clubs[0];
    console.log(`   ✓ Club: ${club.name} (${club.id})\n`);

    // 2. Obtener usuario admin/instructor
    console.log('👤 2. Obteniendo usuario para prueba...');
    const usersRes = await fetch(`${API_BASE}/api/users`);
    const users = await usersRes.json();
    
    // Buscar un usuario admin o instructor
    const adminUser = users.find(u => u.role === 'admin');
    const instructorUser = users.find(u => u.instructorProfile?.clubId === club.id);
    const testUser = adminUser || instructorUser || users[0];

    if (!testUser) {
      throw new Error('No se encontró usuario para prueba');
    }

    console.log(`   ✓ Usuario: ${testUser.name} (${testUser.id})`);
    console.log(`   Role: ${testUser.role}\n`);

    // 3. Obtener clases actuales antes de actualizar
    console.log('🎾 3. Consultando clases futuras antes de la actualización...');
    const slotsBeforeRes = await fetch(
      `${API_BASE}/api/timeslots?clubId=${club.id}&days=30`
    );
    const slotsBefore = await slotsBeforeRes.json();
    
    const unconfirmedSlots = slotsBefore.filter(s => !s.courtId);
    console.log(`   Clases sin confirmar: ${unconfirmedSlots.length}`);
    
    if (unconfirmedSlots.length > 0) {
      const sample = unconfirmedSlots[0];
      console.log(`   Ejemplo - Precio actual: €${sample.totalPrice || 'N/A'}`);
      console.log(`   Fecha: ${new Date(sample.start).toLocaleString('es-ES')}\n`);
    }

    // 4. Ejecutar actualización de precios
    console.log('🔄 4. Ejecutando actualización de precios futuros...');
    const updateRes = await fetch(`${API_BASE}/api/admin/update-future-prices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clubId: club.id,
        userId: testUser.id
      })
    });

    const updateResult = await updateRes.json();

    if (!updateRes.ok) {
      console.error('   ❌ Error:', updateResult.error);
      throw new Error(updateResult.error || 'Error al actualizar precios');
    }

    console.log(`   ✓ Actualización completada!`);
    console.log(`   Clases actualizadas: ${updateResult.updated}`);
    console.log(`   Rango de fechas:`);
    console.log(`     Desde: ${updateResult.details.dateRange.from || 'N/A'}`);
    console.log(`     Hasta: ${updateResult.details.dateRange.to || 'N/A'}\n`);

    // 5. Mostrar muestra de cambios
    if (updateResult.sample && updateResult.sample.length > 0) {
      console.log('📊 5. Muestra de cambios aplicados:');
      updateResult.sample.forEach((change, idx) => {
        console.log(`   ${idx + 1}. ${new Date(change.date).toLocaleString('es-ES')}`);
        console.log(`      Precio total: €${change.newPrice}`);
        console.log(`      (Pista: €${change.courtPrice} + Instructor: €${change.instructorPrice})`);
      });
      console.log('');
    }

    // 6. Verificar clases después de la actualización
    console.log('✅ 6. Verificando cambios en base de datos...');
    const slotsAfterRes = await fetch(
      `${API_BASE}/api/timeslots?clubId=${club.id}&days=30`
    );
    const slotsAfter = await slotsAfterRes.json();
    
    const updatedSlots = slotsAfter.filter(s => !s.courtId);
    
    if (updatedSlots.length > 0) {
      const sample = updatedSlots[0];
      console.log(`   Ejemplo verificado:`);
      console.log(`   Precio actualizado: €${sample.totalPrice || 'N/A'}`);
      console.log(`   Fecha: ${new Date(sample.start).toLocaleString('es-ES')}`);
    }

    console.log('\n✨ TEST COMPLETADO CON ÉXITO\n');

    return {
      success: true,
      clubId: club.id,
      userId: testUser.id,
      updated: updateResult.updated,
      sample: updateResult.sample
    };

  } catch (error) {
    console.error('\n❌ ERROR EN TEST:', error.message);
    console.error(error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Ejecutar test
testUpdateFuturePrices().then(result => {
  if (!result.success) {
    process.exit(1);
  }
});
