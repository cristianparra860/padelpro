const { isSameDay, format } = require('date-fns');

async function fullDiagnostic() {
  console.log('🔍 DIAGNÓSTICO COMPLETO DEL CALENDARIO\n');
  console.log('='.repeat(80));
  
  try {
    // 1. Fetch API data
    console.log('\n📡 PASO 1: Obtener datos de la API');
    const response = await fetch('http://localhost:9002/api/admin/timeslots?clubId=club-1');
    const rawTimeSlots = await response.json();
    console.log(`   ✓ Recibidos ${rawTimeSlots.length} slots de la API`);
    
    // 2. Transform data
    console.log('\n🔄 PASO 2: Transformar datos');
    const fetchedTimeSlotsAll = rawTimeSlots.map(slot => ({
      ...slot,
      startTime: slot.start,
      endTime: slot.end,
      courtNumber: slot.court?.number || null,
      status: slot.courtId ? 'confirmed' : 'pre_registration',
      bookedPlayers: slot.bookings?.map(b => ({
        id: b.userId,
        name: b.user?.name || 'Usuario',
        groupSize: b.groupSize
      })) || [],
      _activityType: 'class'
    }));
    
    const proposals = fetchedTimeSlotsAll.filter(s => s.status === 'pre_registration');
    const confirmed = fetchedTimeSlotsAll.filter(s => s.status === 'confirmed');
    console.log(`   ✓ Total: ${fetchedTimeSlotsAll.length}`);
    console.log(`   ✓ Propuestas: ${proposals.length}`);
    console.log(`   ✓ Confirmadas: ${confirmed.length}`);
    
    // 3. Filter by club and date
    console.log('\n📅 PASO 3: Filtrar por club y fecha (29/10/2025)');
    const currentDate = new Date('2025-10-29T00:00:00Z');
    const activityFilter = 'all';
    const fetchedTimeSlots = fetchedTimeSlotsAll.filter(s => s.clubId === 'club-1');
    
    const activitiesForSelectedDate = fetchedTimeSlots.filter(slot => {
      const slotDate = new Date(slot.startTime);
      return (slot.status === 'pre_registration' || slot.status === 'confirmed' || slot.status === 'confirmed_private' || slot.status === 'forming') &&
        isSameDay(slotDate, currentDate) && (activityFilter === 'all' || activityFilter === 'clases');
    });
    
    const todayProposals = activitiesForSelectedDate.filter(a => a.status === 'pre_registration');
    const todayConfirmed = activitiesForSelectedDate.filter(a => a.status === 'confirmed');
    console.log(`   ✓ Actividades hoy: ${activitiesForSelectedDate.length}`);
    console.log(`   ✓ Propuestas hoy: ${todayProposals.length}`);
    console.log(`   ✓ Confirmadas hoy: ${todayConfirmed.length}`);
    
    // 4. Build confirmed intervals
    console.log('\n⏰ PASO 4: Construir intervalos confirmados');
    const confirmedIntervalsByInstructor = new Map();
    fetchedTimeSlots
      .filter(s => (s.status === 'confirmed' || s.status === 'confirmed_private') && isSameDay(new Date(s.startTime), currentDate))
      .forEach(s => {
        const key = s.instructorId;
        const arr = confirmedIntervalsByInstructor.get(key) || [];
        arr.push({ start: new Date(s.startTime), end: new Date(s.endTime) });
        confirmedIntervalsByInstructor.set(key, arr);
      });
    console.log(`   ✓ Instructores con clases confirmadas: ${confirmedIntervalsByInstructor.size}`);
    
    // 5. Initialize grid
    console.log('\n🏗️ PASO 5: Inicializar grid del calendario');
    const VIRTUAL_ROW_CLASSES = -1;
    const newProcessedData = {};
    const timeHeaders = [];
    for (let hour = 8; hour < 22; hour++) {
      timeHeaders.push(new Date(2025, 0, 1, hour, 0));
      timeHeaders.push(new Date(2025, 0, 1, hour, 30));
    }
    console.log(`   ✓ Generadas ${timeHeaders.length} columnas de tiempo`);
    
    [-1, -2, 1, 2, 3].forEach(courtNum => {
      newProcessedData[courtNum] = {};
      timeHeaders.forEach(th => {
        newProcessedData[courtNum][format(th, 'HH:mm')] = { classes: [] };
      });
    });
    console.log(`   ✓ Inicializadas 5 filas de canchas (incluyendo virtuales -1 y -2)`);
    
    // 6. Process activities
    console.log('\n🎯 PASO 6: Procesar actividades y asignar a celdas');
    let addedToVirtualRow = 0;
    let skippedOverlap = 0;
    let addedToRealCourts = 0;
    
    activitiesForSelectedDate.forEach(activity => {
      const activityStartTime = new Date(activity.startTime);
      const activityEndTime = new Date(activity.endTime);
      let assignedCourtNumber = activity.courtNumber;
      let isProposal = !activity.courtNumber;
      
      // Check overlap
      if (activity._activityType === 'class' && isProposal) {
        const intervals = confirmedIntervalsByInstructor.get(activity.instructorId) || [];
        const overlapsConfirmed = intervals.some(iv => 
          activityStartTime < iv.end && activityEndTime > iv.start
        );
        if (overlapsConfirmed) {
          skippedOverlap++;
          return;
        }
      }
      
      // Assign to virtual row if proposal
      if (isProposal) {
        assignedCourtNumber = VIRTUAL_ROW_CLASSES;
        addedToVirtualRow++;
      } else {
        addedToRealCourts++;
      }
      
      const activityCourt = assignedCourtNumber;
      const timeKey = format(activityStartTime, 'HH:mm');
      
      if (!newProcessedData[activityCourt]) {
        console.log(`   ⚠️ ERROR: Court ${activityCourt} no existe en newProcessedData!`);
        return;
      }
      if (!newProcessedData[activityCourt][timeKey]) {
        console.log(`   ⚠️ ERROR: TimeKey ${timeKey} no existe en court ${activityCourt}!`);
        return;
      }
      
      const isConfirmed = activity.status === 'confirmed' || activity.status === 'confirmed_private';
      
      const cellData = {
        id: `ts-${activity.id}`,
        type: 'class',
        startTime: activityStartTime,
        endTime: activityEndTime,
        isConfirmed: isConfirmed,
        status: activity.status,
        instructorId: activity.instructorId
      };
      
      newProcessedData[activityCourt][timeKey].classes.push(cellData);
    });
    
    console.log(`   ✓ Agregadas a fila virtual (-1): ${addedToVirtualRow}`);
    console.log(`   ✓ Agregadas a pistas reales: ${addedToRealCourts}`);
    console.log(`   ✓ Saltadas por solapamiento: ${skippedOverlap}`);
    
    // 7. Verify virtual row contents
    console.log('\n🔍 PASO 7: Verificar contenido de fila virtual (-1)');
    const virtualRowCells = newProcessedData[-1];
    const nonEmptyCells = Object.keys(virtualRowCells).filter(timeKey => virtualRowCells[timeKey].classes.length > 0);
    console.log(`   ✓ Celdas con propuestas: ${nonEmptyCells.length}`);
    
    if (nonEmptyCells.length > 0) {
      console.log(`\n   📋 Primeras 10 celdas con propuestas:`);
      nonEmptyCells.slice(0, 10).forEach(timeKey => {
        const classes = virtualRowCells[timeKey].classes;
        console.log(`      ${timeKey}: ${classes.length} clase(s) - IDs: ${classes.map(c => c.id.substring(0, 20)).join(', ')}`);
      });
    } else {
      console.log(`   ❌ ERROR: ¡NO HAY PROPUESTAS EN LA FILA VIRTUAL!`);
      console.log(`\n   🔍 Revisando por qué...`);
      console.log(`      - Propuestas hoy: ${todayProposals.length}`);
      console.log(`      - Agregadas a virtual: ${addedToVirtualRow}`);
      console.log(`      - ¿Se procesaron las actividades? ${activitiesForSelectedDate.length > 0 ? 'SÍ' : 'NO'}`);
    }
    
    // 8. Simulate render
    console.log('\n🎨 PASO 8: Simular renderizado');
    const visibleCourtNumbers = [-1, -2, 1, 2, 3]; // Todas visibles
    const includesVirtualClasses = visibleCourtNumbers.includes(-1);
    console.log(`   ✓ visibleCourtNumbers: ${visibleCourtNumbers.join(', ')}`);
    console.log(`   ✓ Incluye fila virtual (-1): ${includesVirtualClasses ? 'SÍ' : 'NO'}`);
    
    if (includesVirtualClasses) {
      console.log(`\n   🎯 La fila virtual DEBERÍA renderizarse`);
      console.log(`   📊 Celdas que se renderizarían: ${nonEmptyCells.length}`);
    } else {
      console.log(`\n   ❌ La fila virtual NO se renderizaría (no está en visibleCourtNumbers)`);
    }
    
    // 9. Final summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 RESUMEN FINAL');
    console.log('='.repeat(80));
    console.log(`API devolvió: ${rawTimeSlots.length} slots (${proposals.length} propuestas)`);
    console.log(`Filtradas para hoy: ${todayProposals.length} propuestas`);
    console.log(`Agregadas a fila virtual: ${addedToVirtualRow}`);
    console.log(`Celdas con contenido en fila virtual: ${nonEmptyCells.length}`);
    console.log(`Fila virtual visible: ${includesVirtualClasses ? 'SÍ' : 'NO'}`);
    
    if (nonEmptyCells.length === 0 && todayProposals.length > 0) {
      console.log(`\n❌ PROBLEMA IDENTIFICADO: Las propuestas existen pero NO llegaron a la fila virtual`);
      console.log(`   Posibles causas:`);
      console.log(`   1. Error en assignedCourtNumber (no se asigna -1)`);
      console.log(`   2. Error en timeKey (formato de hora incorrecto)`);
      console.log(`   3. newProcessedData[-1] no se inicializó correctamente`);
    } else if (nonEmptyCells.length > 0 && !includesVirtualClasses) {
      console.log(`\n❌ PROBLEMA IDENTIFICADO: Las propuestas están en el grid pero la fila virtual no es visible`);
    } else if (nonEmptyCells.length > 0 && includesVirtualClasses) {
      console.log(`\n✅ TODO CORRECTO: Las propuestas deberían mostrarse en el calendario`);
    } else {
      console.log(`\n❓ ESTADO DESCONOCIDO - Revisar logs anteriores`);
    }
    
  } catch (error) {
    console.error('\n❌ ERROR EN DIAGNÓSTICO:', error);
  }
}

fullDiagnostic();
