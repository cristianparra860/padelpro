const fetch = require('node-fetch');

(async () => {
  try {
    console.log('🔍 Fetching calendar data...');
    const res = await fetch('http://localhost:9002/api/admin/calendar?clubId=padel-estrella-madrid&startDate=2025-12-01T00:00:00.000Z&endDate=2025-12-31T23:59:59.999Z');
    const data = await res.json();
    
    console.log('\n📊 Summary:');
    console.log('- Total instructors:', data.instructors?.length);
    console.log('- Total proposed classes:', data.proposedClasses?.length);
    console.log('- Classes with bookings:', data.proposedClasses?.filter(c => c.bookings?.length > 0).length);
    
    // Buscar la clase del 1 de diciembre a las 07:00
    const targetDate = new Date('2025-12-01T06:00:00.000Z'); // 07:00 hora local
    const targetClasses = data.proposedClasses?.filter(cls => {
      const clsStart = new Date(cls.start);
      return clsStart.getTime() === targetDate.getTime();
    });
    
    console.log('\n🎯 Clases del 1 de diciembre a las 07:00 (06:00 UTC):');
    console.log('- Total encontradas:', targetClasses?.length);
    
    if (targetClasses && targetClasses.length > 0) {
      targetClasses.forEach((cls, idx) => {
        console.log(`\n📌 Clase ${idx + 1}:`);
        console.log('  ID:', cls.id);
        console.log('  Instructor ID:', cls.instructorId);
        console.log('  Instructor Name:', cls.instructorName);
        console.log('  Start:', cls.start);
        console.log('  Players Count:', cls.playersCount);
        console.log('  Max Players:', cls.maxPlayers);
        console.log('  Bookings:', cls.bookings?.length || 0);
        
        if (cls.bookings && cls.bookings.length > 0) {
          console.log('\n  📋 Bookings details:');
          cls.bookings.forEach((b, i) => {
            console.log(`    ${i + 1}. User: ${b.user?.name}`);
            console.log(`       Group Size: ${b.groupSize}`);
            console.log(`       Status: ${b.status}`);
            console.log(`       ID: ${b.id}`);
          });
        }
      });
    } else {
      console.log('❌ NO SE ENCONTRARON CLASES en esa fecha/hora');
    }
    
    // Buscar qué instructores tienen clases en esa fecha
    console.log('\n🔍 Instructores disponibles:');
    data.instructors?.forEach(inst => {
      console.log(`  - ${inst.name} (ID: ${inst.id})`);
    });
    
    // Verificar si alguna clase tiene ese instructor
    const instructorWithBooking = data.proposedClasses?.find(c => c.bookings?.length > 0);
    if (instructorWithBooking) {
      console.log('\n✅ Instructor de la clase con bookings:');
      console.log('  Instructor ID:', instructorWithBooking.instructorId);
      console.log('  Instructor Name:', instructorWithBooking.instructorName);
      console.log('  Start:', instructorWithBooking.start);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
})();
