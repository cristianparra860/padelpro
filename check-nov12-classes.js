const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkNov12Classes() {
  try {
    console.log('🔍 Verificando clases del 12 de noviembre...\n');

    const date = new Date('2025-11-12T00:00:00');
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const startTimestamp = startOfDay.getTime();
    const endTimestamp = endOfDay.getTime();

    // Clases confirmadas
    const confirmedClasses = await prisma.$queryRawUnsafe(`
      SELECT 
        t.id,
        t.start,
        t.end,
        t.instructorId,
        i.name as instructorName,
        t.courtId,
        c.number as courtNumber
      FROM TimeSlot t
      LEFT JOIN Court c ON t.courtId = c.id
      LEFT JOIN Instructor i ON t.instructorId = i.id
      WHERE t.start >= ?
        AND t.start <= ?
        AND t.courtId IS NOT NULL
      ORDER BY t.start
    `, startTimestamp, endTimestamp);

    console.log(`📊 Clases confirmadas el 12/nov: ${confirmedClasses.length}\n`);

    confirmedClasses.forEach(cls => {
      const start = new Date(Number(cls.start));
      const end = new Date(Number(cls.end));
      const duration = (Number(cls.end) - Number(cls.start)) / (1000 * 60);
      
      console.log(`⏰ ${start.toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'})} - ${end.toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'})} (${duration} min)`);
      console.log(`   Instructor: ${cls.instructorName}`);
      console.log(`   Pista: ${cls.courtNumber || 'N/A'}`);
      console.log('');
    });

    // Simular bloqueo para Alex Garcia
    const alex = confirmedClasses.find(c => c.instructorName && c.instructorName.includes('Alex'));
    
    if (alex) {
      const clsStart = new Date(Number(alex.start));
      const clsEnd = new Date(Number(alex.end));
      
      console.log(`\n🧪 SIMULANDO BLOQUEO PARA ALEX GARCIA:`);
      console.log(`   Clase confirmada: ${clsStart.toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'})} - ${clsEnd.toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'})}\n`);
      
      const testSlots = ['13:30', '14:00', '14:30', '15:00', '15:30'];
      
      testSlots.forEach(time => {
        const [hour, minute] = time.split(':');
        const slotStart = new Date(date);
        slotStart.setHours(parseInt(hour), parseInt(minute), 0, 0);
        
        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + 60);
        
        // Verificar si es 30min antes
        const timeDiff = clsStart.getTime() - slotStart.getTime();
        const is30MinBefore = timeDiff === 30 * 60 * 1000;
        
        // Verificar solapamiento
        const wouldOverlap = slotEnd > clsStart && slotStart < clsEnd;
        
        const blocked = is30MinBefore || wouldOverlap;
        
        console.log(`   ${time}: ${blocked ? '❌ BLOQUEADO' : '✅ LIBRE'}`);
        if (is30MinBefore) console.log(`      → Es 30min antes (${timeDiff / 60000} min de diferencia)`);
        if (wouldOverlap) console.log(`      → Solaparía: nueva clase ${slotStart.toLocaleTimeString()} - ${slotEnd.toLocaleTimeString()}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkNov12Classes();
