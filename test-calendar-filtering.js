const { isSameDay } = require('date-fns');

async function testCalendarFiltering() {
  try {
    const response = await fetch('http://localhost:9002/api/admin/timeslots?clubId=club-1');
    const rawTimeSlots = await response.json();
    
    // Transform data (igual que en el componente)
    const fetchedTimeSlotsAll = rawTimeSlots.map(slot => ({
      ...slot,
      startTime: slot.start,
      endTime: slot.end,
      courtNumber: slot.court?.number || null,
      status: slot.courtId ? 'confirmed' : 'pre_registration',
      _activityType: 'class'
    }));
    
    console.log('📊 Datos transformados:');
    console.log('   Total:', fetchedTimeSlotsAll.length);
    console.log('   Confirmadas:', fetchedTimeSlotsAll.filter(s => s.status === 'confirmed').length);
    console.log('   Propuestas:', fetchedTimeSlotsAll.filter(s => s.status === 'pre_registration').length);
    
    // Filtrar por fecha (hoy 29 de octubre)
    const currentDate = new Date('2025-10-29T00:00:00Z');
    const activityFilter = 'all';
    
    const fetchedTimeSlots = fetchedTimeSlotsAll.filter(s => s.clubId === 'club-1');
    
    const activitiesForSelectedDate = fetchedTimeSlots.filter(slot => {
      const slotDate = new Date(slot.startTime);
      return (slot.status === 'pre_registration' || slot.status === 'confirmed' || slot.status === 'confirmed_private' || slot.status === 'forming') &&
        isSameDay(slotDate, currentDate) && (activityFilter === 'all' || activityFilter === 'clases');
    });
    
    console.log('\n🗓️ Después de filtrar por fecha (29/10):');
    console.log('   Total:', activitiesForSelectedDate.length);
    console.log('   Propuestas:', activitiesForSelectedDate.filter(a => a.status === 'pre_registration').length);
    console.log('   Confirmadas:', activitiesForSelectedDate.filter(a => a.status === 'confirmed').length);
    
    // Simular el filtrado de solapamientos
    const confirmedIntervalsByInstructor = new Map();
    fetchedTimeSlots
      .filter(s => (s.status === 'confirmed' || s.status === 'confirmed_private') && isSameDay(new Date(s.startTime), currentDate))
      .forEach(s => {
        const key = s.instructorId;
        const arr = confirmedIntervalsByInstructor.get(key) || [];
        arr.push({ start: new Date(s.startTime), end: new Date(s.endTime) });
        confirmedIntervalsByInstructor.set(key, arr);
      });
    
    console.log('\n📝 Intervalos confirmados por instructor:');
    confirmedIntervalsByInstructor.forEach((intervals, instructorId) => {
      console.log(`   ${instructorId}:`, intervals.map(iv => `${iv.start.toISOString()} - ${iv.end.toISOString()}`));
    });
    
    let filteredOut = 0;
    let kept = 0;
    
    const finalActivities = activitiesForSelectedDate.filter(activity => {
      const activityStartTime = new Date(activity.startTime);
      const activityEndTime = new Date(activity.endTime);
      const isProposal = !activity.courtNumber;
      
      if (activity._activityType === 'class' && isProposal) {
        const intervals = confirmedIntervalsByInstructor.get(activity.instructorId) || [];
        const overlapsConfirmed = intervals.some(iv => 
          activityStartTime < iv.end && activityEndTime > iv.start
        );
        
        if (overlapsConfirmed) {
          filteredOut++;
          console.log(`   ❌ Filtrada propuesta ${activity.id} (${new Date(activity.startTime).toISOString()}) - solapa con confirmada`);
          return false;
        }
        kept++;
      }
      
      return true;
    });
    
    console.log('\n🎯 Resultado final:');
    console.log('   Propuestas mantenidas:', kept);
    console.log('   Propuestas filtradas por solapamiento:', filteredOut);
    console.log('   Actividades totales para mostrar:', finalActivities.length);
    console.log('   Propuestas finales:', finalActivities.filter(a => a.status === 'pre_registration').length);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testCalendarFiltering();
