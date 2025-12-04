// Debug: verificar qué devuelve el API para el instructor Cristian Parra

async function debugInstructorSlots() {
  try {
    const instructorId = 'instructor-cristian-parra';
    
    console.log('🔍 Consultando API con instructorId:', instructorId);
    const response = await fetch(`http://localhost:9002/api/timeslots?instructorId=${instructorId}`);
    const data = await response.json();
    
    console.log('\n📊 Respuesta del API:');
    console.log('   Tipo:', Array.isArray(data) ? 'Array' : 'Object');
    
    const slots = Array.isArray(data) ? data : (data.slots || data.timeSlots || []);
    console.log('   Total slots:', slots.length);
    
    if (slots.length > 0) {
      console.log('\n📝 Primeros 3 slots:');
      slots.slice(0, 3).forEach((slot, i) => {
        console.log(`\n   Slot ${i + 1}:`);
        console.log('   - ID:', slot.id);
        console.log('   - Fecha:', new Date(slot.start).toLocaleString('es-ES'));
        console.log('   - InstructorId:', slot.instructorId);
        console.log('   - InstructorName:', slot.instructorName);
        console.log('   - CourtId:', slot.courtId || 'NULL (propuesta)');
        console.log('   - CurrentBookings:', slot.currentBookings || 0);
        console.log('   - CreditsSlots:', slot.creditsSlots || '[]');
      });
      
      // Filtrar propuestas futuras
      const now = new Date();
      const futureProposals = slots.filter(slot => {
        const slotDate = new Date(slot.start);
        const isFuture = slotDate > now;
        const isProposal = !slot.courtId || slot.courtId === null;
        return isFuture && isProposal;
      });
      
      console.log('\n✅ Propuestas futuras (courtId = NULL):', futureProposals.length);
      
      if (futureProposals.length > 0) {
        console.log('\n📋 Ejemplo de propuesta futura:');
        const example = futureProposals[0];
        console.log('   - ID:', example.id);
        console.log('   - Fecha:', new Date(example.start).toLocaleString('es-ES'));
        console.log('   - CourtId:', example.courtId);
        console.log('   - Modificable: SÍ ✅');
      }
    } else {
      console.log('\n❌ No hay slots para este instructor');
      console.log('   Verifica que el instructorId sea correcto');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugInstructorSlots();
