const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findMyBookingsDec6() {
  try {
    const dec6Start = new Date('2025-12-06T00:00:00.000Z').getTime();
    const dec6End = new Date('2025-12-06T23:59:59.999Z').getTime();
    
    console.log('🔍 Buscando TODAS tus inscripciones del 6 de diciembre...\n');
    
    const bookings = await prisma.$queryRaw`
      SELECT 
        ts.id as timeSlotId,
        ts.start,
        ts.level,
        ts.levelRange,
        ts.genderCategory,
        i.name as instructor,
        i.levelRanges,
        u.name as userName,
        u.email as userEmail,
        b.groupSize,
        b.status
      FROM Booking b
      JOIN TimeSlot ts ON b.timeSlotId = ts.id
      LEFT JOIN Instructor i ON ts.instructorId = i.id
      JOIN User u ON b.userId = u.id
      WHERE ts.start >= ${dec6Start} 
        AND ts.start <= ${dec6End}
        AND (u.email LIKE '%jugador1%' OR u.email LIKE '%marc%')
        AND b.status != 'CANCELLED'
      ORDER BY ts.start, i.name
    `;
    
    console.log(`📊 Total inscripciones encontradas: ${bookings.length}\n`);
    
    if (bookings.length === 0) {
      console.log('⚠️ No se encontraron inscripciones del 6/12');
      return;
    }
    
    bookings.forEach((b, i) => {
      const date = new Date(Number(b.start));
      console.log(`${i + 1}. ${date.toLocaleTimeString('es-ES')} - ${b.instructor}`);
      console.log(`   Usuario: ${b.userName}`);
      console.log(`   Level: "${b.level}"`);
      console.log(`   LevelRange: "${b.levelRange || 'NULL'}"`);
      console.log(`   Género: ${b.genderCategory || 'NULL'}`);
      console.log(`   Modalidad: ${b.groupSize} jugador${b.groupSize > 1 ? 'es' : ''}`);
      
      // Verificar el tipo de nivel
      const isIndividual = /^\d+\.\d+$/.test(b.level);
      const isRange = /^\d+-\d+$/.test(b.level);
      
      if (isIndividual) {
        console.log(`   ❌ PROBLEMA: Muestra nivel individual`);
        if (b.levelRanges) {
          const ranges = JSON.parse(b.levelRanges);
          console.log(`   💡 Rangos del instructor:`);
          ranges.forEach(r => console.log(`      • ${r.minLevel} - ${r.maxLevel}`));
        }
      } else if (isRange) {
        console.log(`   ✅ CORRECTO: Muestra rango`);
      } else if (b.level === 'abierto' || b.level === 'ABIERTO') {
        console.log(`   ✅ CORRECTO: Clase abierta`);
      }
      
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findMyBookingsDec6();
