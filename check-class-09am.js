const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkClass() {
  console.log('🔍 Verificando clase de Carlos Martínez del 17 Oct a las 09:00...\n');

  try {
    // Buscar la clase
    const slots = await prisma.$queryRaw`
      SELECT 
        ts.id,
        ts.start,
        ts.end,
        ts.maxPlayers,
        ts.courtNumber,
        ts.level,
        ts.category,
        i.name as instructorName,
        COUNT(b.id) as bookingsCount
      FROM TimeSlot ts
      LEFT JOIN Instructor i ON ts.instructorId = i.id
      LEFT JOIN Booking b ON b.timeSlotId = ts.id
      WHERE ts.start LIKE '2025-10-17 09:00%'
      OR ts.start LIKE '2025-10-17T09:00%'
      GROUP BY ts.id
      LIMIT 5
    `;

    if (slots.length === 0) {
      console.log('❌ No se encontró ninguna clase a las 09:00 del 17');
    } else {
      console.log(`Encontradas ${slots.length} clases a las 09:00:\n`);
      
      for (const slot of slots) {
        const date = new Date(slot.start);
        const bookedCount = Number(slot.bookingsCount);
        
        console.log(`📅 Clase: ${slot.id.substring(0, 30)}...`);
        console.log(`   ⏰ Hora: ${date.toLocaleString('es-ES')}`);
        console.log(`   👥 Capacidad: ${bookedCount}/${slot.maxPlayers} jugadores`);
        console.log(`   👨‍🏫 Instructor: ${slot.instructorName}`);
        console.log(`   📊 Nivel: ${slot.level} | Categoría: ${slot.category}`);
        console.log(`   🎾 Pista: ${slot.courtNumber || 'Sin asignar'}`);
        
        // Ver quién está inscrito
        const bookings = await prisma.$queryRaw`
          SELECT b.id, b.groupSize, u.name, b.createdAt
          FROM Booking b
          JOIN User u ON b.userId = u.id
          WHERE b.timeSlotId = ${slot.id}
        `;
        
        console.log(`\n   👤 Inscritos (${bookings.length}):`);
        bookings.forEach((b, i) => {
          console.log(`      ${i + 1}. ${b.name} - ${b.groupSize} jugador(es) - ${new Date(b.createdAt).toLocaleString('es-ES')}`);
        });
        
        console.log(`\n   ⚙️  Análisis:`);
        if (bookedCount >= slot.maxPlayers) {
          console.log(`      ✅ Clase COMPLETA (${bookedCount}/${slot.maxPlayers})`);
          if (!slot.courtNumber) {
            console.log(`      ⚠️  PROBLEMA: Clase completa pero SIN PISTA ASIGNADA`);
          } else {
            console.log(`      ✅ Pista asignada correctamente: ${slot.courtNumber}`);
          }
        } else {
          console.log(`      ℹ️  Clase no completa (${bookedCount}/${slot.maxPlayers})`);
        }
        console.log('');
      }
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkClass();
