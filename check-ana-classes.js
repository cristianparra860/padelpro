const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAnaClasses() {
  try {
    console.log('🔍 Verificando clases de Ana Lopez el 10 de noviembre...\n');

    const date = new Date('2025-11-10T00:00:00');
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Buscar Ana
    const ana = await prisma.instructor.findFirst({
      where: { 
        name: { contains: 'Ana' }
      }
    });

    if (!ana) {
      console.log('❌ Ana no encontrada');
      return;
    }

    console.log(`✅ Ana ID: ${ana.id}\n`);

    const startTimestamp = startOfDay.getTime();
    const endTimestamp = endOfDay.getTime();

    // Clases confirmadas de Ana hoy
    const confirmedClasses = await prisma.$queryRawUnsafe(`
      SELECT 
        t.id,
        t.start,
        t.end,
        t.courtId,
        c.number as courtNumber
      FROM TimeSlot t
      LEFT JOIN Court c ON t.courtId = c.id
      WHERE t.instructorId = ?
        AND t.start >= ?
        AND t.start <= ?
        AND t.courtId IS NOT NULL
      ORDER BY t.start
    `, ana.id, startTimestamp, endTimestamp);

    console.log(`📊 Clases confirmadas de Ana: ${confirmedClasses.length}\n`);

    confirmedClasses.forEach(cls => {
      const start = new Date(Number(cls.start));
      const end = new Date(Number(cls.end));
      const duration = (Number(cls.end) - Number(cls.start)) / (1000 * 60);
      
      console.log(`⏰ ${start.toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'})} - ${end.toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'})} (${duration} min)`);
      console.log(`   Pista: ${cls.courtNumber || 'N/A'}`);
      console.log('');
    });

    // Simular bloqueo
    if (confirmedClasses.length > 0) {
      const cls = confirmedClasses[0];
      const clsStart = new Date(Number(cls.start));
      const clsEnd = new Date(Number(cls.end));
      
      console.log(`🧪 SIMULANDO BLOQUEO:`);
      console.log(`   Clase: ${clsStart.toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'})} - ${clsEnd.toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'})}\n`);
      
      const testSlots = ['08:00', '08:30', '09:00', '09:30', '10:00'];
      
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
        if (is30MinBefore) console.log(`      → Es 30min antes`);
        if (wouldOverlap) console.log(`      → Solaparía (${slotStart.toLocaleTimeString()} - ${slotEnd.toLocaleTimeString()})`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAnaClasses();
