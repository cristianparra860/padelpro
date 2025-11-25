/**
 * Script de prueba para verificar las APIs de franjas horarias
 */

const API_BASE = 'http://localhost:9002';

async function testPriceSlotsAPIs() {
  console.log('🧪 TEST: APIs de Franjas Horarias\n');

  try {
    // 1. Obtener club
    console.log('📋 1. Obteniendo club...');
    const clubsRes = await fetch(`${API_BASE}/api/clubs`);
    const clubs = await clubsRes.json();
    const club = clubs[0];
    console.log(`   ✓ Club: ${club.name} (${club.id})\n`);

    // 2. Listar franjas horarias existentes
    console.log('📊 2. Listando franjas horarias existentes...');
    const listRes = await fetch(`${API_BASE}/api/admin/clubs/${club.id}/price-slots`);
    const existingSlots = await listRes.json();
    console.log(`   Franjas actuales: ${existingSlots.length}`);
    existingSlots.forEach(slot => {
      const days = JSON.parse(slot.daysOfWeek);
      console.log(`   - ${slot.name}: €${slot.price}/h (${slot.startTime}-${slot.endTime})`);
    });
    console.log('');

    // 3. Crear nueva franja horaria de prueba
    console.log('➕ 3. Creando nueva franja horaria...');
    const createRes = await fetch(`${API_BASE}/api/admin/clubs/${club.id}/price-slots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Horario Test',
        startTime: '14:00',
        endTime: '16:00',
        price: 15,
        daysOfWeek: [1, 2, 3, 4, 5], // Lun-Vie
        priority: 5
      })
    });

    if (!createRes.ok) {
      const error = await createRes.json();
      throw new Error(error.error || 'Error al crear franja');
    }

    const newSlot = await createRes.json();
    console.log(`   ✓ Franja creada: ${newSlot.name} (ID: ${newSlot.id})`);
    console.log(`   Precio: €${newSlot.price}/hora\n`);

    // 4. Actualizar la franja
    console.log('✏️ 4. Actualizando franja...');
    const updateRes = await fetch(`${API_BASE}/api/admin/clubs/${club.id}/price-slots/${newSlot.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        price: 18,
        name: 'Horario Test Actualizado'
      })
    });

    if (!updateRes.ok) {
      const error = await updateRes.json();
      throw new Error(error.error || 'Error al actualizar franja');
    }

    const updated = await updateRes.json();
    console.log(`   ✓ Franja actualizada: ${updated.name}`);
    console.log(`   Nuevo precio: €${updated.price}/hora\n`);

    // 5. Verificar actualización
    console.log('🔍 5. Verificando cambios...');
    const verifyRes = await fetch(`${API_BASE}/api/admin/clubs/${club.id}/price-slots`);
    const allSlots = await verifyRes.json();
    const testSlot = allSlots.find(s => s.id === newSlot.id);
    
    if (testSlot) {
      console.log(`   ✓ Franja encontrada: ${testSlot.name} - €${testSlot.price}/h\n`);
    } else {
      throw new Error('Franja no encontrada después de actualizar');
    }

    // 6. Eliminar la franja de prueba
    console.log('🗑️ 6. Eliminando franja de prueba...');
    const deleteRes = await fetch(`${API_BASE}/api/admin/clubs/${club.id}/price-slots/${newSlot.id}`, {
      method: 'DELETE'
    });

    if (!deleteRes.ok) {
      const error = await deleteRes.json();
      throw new Error(error.error || 'Error al eliminar franja');
    }

    console.log(`   ✓ Franja eliminada correctamente\n`);

    // 7. Verificar eliminación
    console.log('✅ 7. Verificando eliminación...');
    const finalRes = await fetch(`${API_BASE}/api/admin/clubs/${club.id}/price-slots`);
    const finalSlots = await finalRes.json();
    const deletedSlot = finalSlots.find(s => s.id === newSlot.id);
    
    if (!deletedSlot) {
      console.log(`   ✓ Franja eliminada de la base de datos\n`);
    } else {
      throw new Error('Franja aún existe después de eliminar');
    }

    console.log('✨ TEST COMPLETADO CON ÉXITO\n');
    console.log('📋 Estado final:');
    console.log(`   - Total franjas: ${finalSlots.length}`);
    console.log(`   - CRUD funcionando correctamente ✓\n`);

    return { success: true };

  } catch (error) {
    console.error('\n❌ ERROR EN TEST:', error.message);
    console.error(error);
    return { success: false, error: error.message };
  }
}

// Ejecutar test
testPriceSlotsAPIs().then(result => {
  if (!result.success) {
    process.exit(1);
  }
});
