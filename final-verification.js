// Verificación final de propuestas por instructor en el calendario

async function finalCheck() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('✅ VERIFICACIÓN FINAL - PROPUESTAS POR INSTRUCTOR');
    console.log('='.repeat(80));
    console.log('');

    const response = await fetch('http://localhost:9002/api/admin/calendar?clubId=club-1&startDate=2025-10-29&endDate=2025-11-04');
    const data = await response.json();

    console.log('📊 RESUMEN DEL API CALENDAR:');
    console.log(`   Total Clases: ${data.summary.totalClasses}`);
    console.log(`   🔶 Propuestas: ${data.summary.proposedClasses}`);
    console.log(`   🟢 Confirmadas: ${data.summary.confirmedClasses}`);
    console.log(`   👥 Instructores: ${data.summary.totalInstructors}`);
    console.log('');

    // Contar propuestas por instructor
    const proposalEvents = data.events.filter(e => e.type === 'class-proposal');
    const byInstructor = {};

    proposalEvents.forEach(event => {
      const name = event.instructorName || 'Sin instructor';
      if (!byInstructor[name]) {
        byInstructor[name] = { count: 0, hours: new Set() };
      }
      byInstructor[name].count++;
      
      // Extraer hora del evento
      const hour = new Date(event.start).getHours();
      byInstructor[name].hours.add(hour);
    });

    console.log('📊 PROPUESTAS VISIBLES EN EL CALENDARIO:\n');
    for (const [name, data] of Object.entries(byInstructor)) {
      const hours = Array.from(data.hours).sort((a, b) => a - b);
      console.log(`   👤 ${name}:`);
      console.log(`      - Propuestas: ${data.count}`);
      console.log(`      - Horarios: ${hours.join('h, ')}h`);
      console.log('');
    }

    // Verificar distribución de eventos confirmados
    const confirmedEvents = data.events.filter(e => e.type === 'class-confirmed');
    if (confirmedEvents.length > 0) {
      console.log('📊 CLASES CONFIRMADAS:\n');
      confirmedEvents.forEach(event => {
        const time = new Date(event.start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        console.log(`   🟢 ${event.title} - ${time} (Pista ${event.courtNumber})`);
      });
      console.log('');
    }

    console.log('='.repeat(80));
    console.log('🎉 RESULTADO FINAL:');
    console.log('='.repeat(80));
    console.log('');
    console.log(`✅ ${Object.keys(byInstructor).length} instructores tienen propuestas en el calendario`);
    console.log(`✅ Total de ${data.summary.proposedClasses} cuadrados naranjas disponibles`);
    console.log(`✅ Horarios cubiertos: ${Math.min(...Object.values(byInstructor).map(d => d.hours.size))} - ${Math.max(...Object.values(byInstructor).map(d => d.hours.size))} horas por instructor`);
    console.log('');
    console.log('🎯 Abre el navegador en: http://localhost:9002/admin/database');
    console.log('   Presiona Ctrl+Shift+R y verás los cuadrados naranjas de TODOS los instructores');
    console.log('');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('Error:', error.message);
  }
}

finalCheck();
