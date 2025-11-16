const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkNov9Classes() {
  try {
    console.log('🔍 Verificando clases confirmadas del 9 de noviembre...\n');

    const date = new Date('2025-11-09T00:00:00');
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const startTimestamp = startOfDay.getTime();
    const endTimestamp = endOfDay.getTime();

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

    console.log(`📊 Clases confirmadas el 9/nov: ${confirmedClasses.length}\n`);

    confirmedClasses.forEach(cls => {
      const start = new Date(Number(cls.start));
      const end = new Date(Number(cls.end));
      const duration = (Number(cls.end) - Number(cls.start)) / (1000 * 60);
      
      console.log(`⏰ ${start.toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'})} - ${end.toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'})} (${duration} min)`);
      console.log(`   Instructor: ${cls.instructorName}`);
      console.log(`   Pista: ${cls.courtNumber || 'N/A'}`);
      console.log('');
    });

    // Ahora simular la lógica de bloqueo para Carlos
    const carlos = confirmedClasses.find(c => c.instructorName && c.instructorName.includes('Carlos'));
    
    if (carlos) {
      const clsStart = new Date(Number(carlos.start));
      const clsEnd = new Date(Number(carlos.end));
      
      console.log(`\n🧪 SIMULANDO BLOQUEO PARA CARLOS:`);
      console.log(`   Clase confirmada: ${clsStart.toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'})} - ${clsEnd.toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'})}\n`);
      
      const testSlots = ['08:00', '08:30', '09:00', '09:30', '10:00'];
      
      testSlots.forEach(time => {
        const [hour, minute] = time.split(':');
        const slotStart = new Date(date);
        slotStart.setHours(parseInt(hour), parseInt(minute), 0, 0);
        
        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + 60);
        
        const wouldOverlap = slotStart < clsEnd && slotEnd > clsStart;
        
        console.log(`   ${time}: ${wouldOverlap ? '❌ BLOQUEADO' : '✅ LIBRE'}`);
        if (wouldOverlap) {
          console.log(`      → Nueva clase ${slotStart.toLocaleTimeString()} - ${slotEnd.toLocaleTimeString()}`);
          console.log(`      → Solapa con ${clsStart.toLocaleTimeString()} - ${clsEnd.toLocaleTimeString()}`);
        }
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkNov9Classes();
