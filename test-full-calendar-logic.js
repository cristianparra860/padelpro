const { isSameDay, format } = require('date-fns');

async function testFullCalendarLogic() {
  try {
    console.log('🔍 Simulando lógica completa del calendario...\n');
    
    // 1. Fetch data
    const response = await fetch('http://localhost:9002/api/admin/timeslots?clubId=club-1');
    const rawTimeSlots = await response.json();
    
    // 2. Transform data (igual que línea 146-156 del componente)
    const fetchedTimeSlotsAll = rawTimeSlots.map(slot => ({
      ...slot,
      startTime: slot.start,
      endTime: slot.end,
      courtNumber: slot.court?.number || null,
      status: slot.courtId ? 'confirmed' : 'pre_registration',
      bookedPlayers: slot.bookings?.map(booking => ({
        id: booking.userId,
        name: booking.user?.name || 'Usuario',
        level: booking.user?.level,
        avatarUrl: booking.user?.image,
      })) || [],
      _activityType: 'class'
    }));
    
    console.log('📊 Datos del calendario:');
    console.log('   Total:', fetchedTimeSlotsAll.length);
    console.log('   Confirmadas:', fetchedTimeSlotsAll.filter(s => s.status === 'confirmed').length);
    console.log('   Propuestas:', fetchedTimeSlotsAll.filter(s => s.status === 'pre_registration').length);
    
    // 3. Filter by date and club
    const currentDate = new Date('2025-10-29T00:00:00Z');
    const activityFilter = 'all';
    const fetchedTimeSlots = fetchedTimeSlotsAll.filter(s => s.clubId === 'club-1');
    
    // 4. Filter for selected date (línea 212-235)
    const activitiesForSelectedDate = fetchedTimeSlots.filter(slot => {
      const slotDate = new Date(slot.startTime);
      return (slot.status === 'pre_registration' || slot.status === 'confirmed' || slot.status === 'confirmed_private' || slot.status === 'forming') &&
        isSameDay(slotDate, currentDate) && (activityFilter === 'all' || activityFilter === 'clases');
    });
    
    console.log('\n🗓️ Actividades para fecha seleccionada (29/10):');
    console.log('   Total:', activitiesForSelectedDate.length);
    console.log('   Propuestas:', activitiesForSelectedDate.filter(a => a.status === 'pre_registration').length);
    console.log('   Confirmadas:', activitiesForSelectedDate.filter(a => a.status === 'confirmed').length);
    
    // 5. Build confirmed intervals (línea 243-251)
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
      console.log(`   ${instructorId}:`, intervals.map(iv => `${new Date(iv.start).toISOString().substring(11, 16)}-${new Date(iv.end).toISOString().substring(11, 16)}`));
    });
    
    // 6. Process activities (línea 255-308)
    const VIRTUAL_ROW_CLASSES_COURT_NUMBER = -1;
    const newProcessedData = {};
    
    // Initialize grid
    const timeHeaders = [];
    for (let hour = 8; hour < 22; hour++) {
      timeHeaders.push(new Date(2025, 0, 1, hour, 0));
      timeHeaders.push(new Date(2025, 0, 1, hour, 30));
    }
    
    [-1, -2, 1, 2, 3].forEach(courtNum => {
      newProcessedData[courtNum] = {};
      timeHeaders.forEach(th => {
        newProcessedData[courtNum][format(th, 'HH:mm')] = { classes: [] };
      });
    });
    
    let skippedOverlap = 0;
    let addedToVirtualRow = 0;
    
    activitiesForSelectedDate.forEach(activity => {
      const activityStartTime = new Date(activity.startTime);
      const activityEndTime = new Date(activity.endTime);
      
      let assignedCourtNumber = activity.courtNumber;
      let isProposal = !activity.courtNumber;
      
      // Hide proposals that overlap a confirmed class (línea 263-274)
      if (activity._activityType === 'class' && isProposal) {
        const intervals = confirmedIntervalsByInstructor.get(activity.instructorId) || [];
        const overlapsConfirmed = intervals.some(iv => 
          activityStartTime < iv.end && activityEndTime > iv.start
        );
        if (overlapsConfirmed) {
          skippedOverlap++;
          console.log(`   ⏭️  Saltada propuesta ${activity.id.substring(0, 20)} (${format(activityStartTime, 'HH:mm')}) - solapa con confirmada`);
          return; // Skip
        }
      }
      
      // Assign to virtual row if proposal (línea 291)
      if (isProposal) {
        assignedCourtNumber = VIRTUAL_ROW_CLASSES_COURT_NUMBER;
        addedToVirtualRow++;
      }
      
      const activityCourt = assignedCourtNumber;
      const timeKey = format(activityStartTime, 'HH:mm');
      
      if (!newProcessedData[activityCourt]) {
        newProcessedData[activityCourt] = {};
      }
      if (!newProcessedData[activityCourt][timeKey]) {
        newProcessedData[activityCourt][timeKey] = { classes: [] };
      }
      
      // Simular isSlotEffectivelyCompleted
      const isConfirmed = activity.status === 'confirmed' || activity.status === 'confirmed_private';
      
      const cellData = {
        id: `ts-${activity.id}`,
        type: 'class',
        startTime: activityStartTime,
        endTime: activityEndTime,
        isConfirmed: isConfirmed,
        status: activity.status
      };
      
      newProcessedData[activityCourt][timeKey].classes.push(cellData);
    });
    
    console.log('\n✅ Procesamiento completado:');
    console.log('   Saltadas por solapamiento:', skippedOverlap);
    console.log('   Agregadas a fila virtual (-1):', addedToVirtualRow);
    
    // 7. Count results
    let totalClasses = 0;
    let totalProposals = 0;
    Object.keys(newProcessedData).forEach(courtNum => {
      Object.keys(newProcessedData[courtNum]).forEach(timeKey => {
        const classes = newProcessedData[courtNum][timeKey].classes || [];
        totalClasses += classes.length;
        totalProposals += classes.filter(c => c.type === 'class' && !c.isConfirmed).length;
      });
    });
    
    console.log('\n📦 Datos procesados para calendario:');
    console.log('   Courts con datos:', Object.keys(newProcessedData).length);
    console.log('   Total clases:', totalClasses);
    console.log('   Total propuestas:', totalProposals);
    console.log('   Slots en fila virtual (-1):', newProcessedData[-1] ? Object.keys(newProcessedData[-1]).filter(k => newProcessedData[-1][k].classes.length > 0).length : 0);
    
    if (newProcessedData[-1]) {
      console.log('\n🔍 Primeros 5 slots de fila virtual:');
      Object.keys(newProcessedData[-1])
        .filter(k => newProcessedData[-1][k].classes.length > 0)
        .slice(0, 5)
        .forEach(timeKey => {
          const classes = newProcessedData[-1][timeKey].classes;
          console.log(`   ${timeKey}: ${classes.length} clase(s) - ${classes.map(c => c.id.substring(3, 23)).join(', ')}`);
        });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testFullCalendarLogic();
