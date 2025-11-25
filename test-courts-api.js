/**
 * Script de prueba para verificar las APIs de pistas
 */

const API_BASE = 'http://localhost:9002';

async function testCourtsAPIs() {
  console.log('🧪 TEST: APIs de Pistas\n');

  try {
    // 1. Obtener club
    console.log('📋 1. Obteniendo club...');
    const clubsRes = await fetch(`${API_BASE}/api/clubs`);
    const clubs = await clubsRes.json();
    const club = clubs[0];
    console.log(`   ✓ Club: ${club.name} (${club.id})\n`);

    // 2. Listar pistas existentes
    console.log('🏟️ 2. Listando pistas existentes...');
    const listRes = await fetch(`${API_BASE}/api/admin/clubs/${club.id}/courts`);
    const existingCourts = await listRes.json();
    console.log(`   Pistas actuales: ${existingCourts.length}`);
    existingCourts.forEach(court => {
      console.log(`   - Pista #${court.number}: ${court.name || 'Sin nombre'}`);
    });
    console.log('');

    // 3. Crear nueva pista de prueba
    console.log('➕ 3. Creando nueva pista...');
    const maxNumber = existingCourts.length > 0 
      ? Math.max(...existingCourts.map(c => c.number)) 
      : 0;
    const testNumber = maxNumber + 1;

    const createRes = await fetch(`${API_BASE}/api/admin/clubs/${club.id}/courts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        number: testNumber,
        name: `Pista Test ${testNumber}`
      })
    });

    if (!createRes.ok) {
      const error = await createRes.json();
      throw new Error(error.error || 'Error al crear pista');
    }

    const newCourt = await createRes.json();
    console.log(`   ✓ Pista creada: ${newCourt.name} (ID: ${newCourt.id})`);
    console.log(`   Número: #${newCourt.number}\n`);

    // 4. Actualizar la pista
    console.log('✏️ 4. Actualizando pista...');
    const updateRes = await fetch(`${API_BASE}/api/admin/clubs/${club.id}/courts/${newCourt.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Pista Test Actualizada'
      })
    });

    if (!updateRes.ok) {
      const error = await updateRes.json();
      throw new Error(error.error || 'Error al actualizar pista');
    }

    const updated = await updateRes.json();
    console.log(`   ✓ Pista actualizada: ${updated.name}`);
    console.log(`   Número: #${updated.number}\n`);

    // 5. Verificar actualización
    console.log('🔍 5. Verificando cambios...');
    const verifyRes = await fetch(`${API_BASE}/api/admin/clubs/${club.id}/courts`);
    const allCourts = await verifyRes.json();
    const testCourt = allCourts.find(c => c.id === newCourt.id);
    
    if (testCourt) {
      console.log(`   ✓ Pista encontrada: ${testCourt.name} #${testCourt.number}\n`);
    } else {
      throw new Error('Pista no encontrada después de actualizar');
    }

    // 6. Eliminar la pista de prueba
    console.log('🗑️ 6. Eliminando pista de prueba...');
    const deleteRes = await fetch(`${API_BASE}/api/admin/clubs/${club.id}/courts/${newCourt.id}`, {
      method: 'DELETE'
    });

    if (!deleteRes.ok) {
      const error = await deleteRes.json();
      throw new Error(error.error || 'Error al eliminar pista');
    }

    console.log(`   ✓ Pista eliminada correctamente\n`);

    // 7. Verificar eliminación
    console.log('✅ 7. Verificando eliminación...');
    const finalRes = await fetch(`${API_BASE}/api/admin/clubs/${club.id}/courts`);
    const finalCourts = await finalRes.json();
    const deletedCourt = finalCourts.find(c => c.id === newCourt.id);
    
    if (!deletedCourt) {
      console.log(`   ✓ Pista eliminada de la base de datos\n`);
    } else {
      throw new Error('Pista aún existe después de eliminar');
    }

    console.log('✨ TEST COMPLETADO CON ÉXITO\n');
    console.log('📋 Estado final:');
    console.log(`   - Total pistas: ${finalCourts.length}`);
    console.log(`   - CRUD funcionando correctamente ✓\n`);

    return { success: true };

  } catch (error) {
    console.error('\n❌ ERROR EN TEST:', error.message);
    console.error(error);
    return { success: false, error: error.message };
  }
}

// Ejecutar test
testCourtsAPIs().then(result => {
  if (!result.success) {
    process.exit(1);
  }
});
