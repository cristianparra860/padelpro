const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSinglePlayerClasses() {
  console.log('🔍 Buscando clases con maxPlayers = 1...\n');

  try {
    const slots = await prisma.$queryRaw`
      SELECT 
        ts.id,
        ts.start,
        ts.end,
        ts.maxPlayers,
        ts.courtNumber,
        ts.level,
        c.name as clubName,
        (SELECT COUNT(*) FROM Booking WHERE timeSlotId = ts.id) as bookingsCount
      FROM TimeSlot ts
      LEFT JOIN Club c ON ts.clubId = c.id
      WHERE ts.maxPlayers = 1
      AND ts.start >= datetime('now')
      ORDER BY ts.start
      LIMIT 10
    `;

    if (slots.length === 0) {
      console.log('❌ No se encontraron clases con maxPlayers = 1');
      console.log('\n🔍 Buscando clases con pocos jugadores...\n');
      
      const smallSlots = await prisma.$queryRaw`
        SELECT 
          ts.id,
          ts.start,
          ts.end,
          ts.maxPlayers,
          ts.courtNumber,
          ts.level,
          c.name as clubName,
          (SELECT COUNT(*) FROM Booking WHERE timeSlotId = ts.id) as bookingsCount
        FROM TimeSlot ts
        LEFT JOIN Club c ON ts.clubId = c.id
        WHERE ts.courtNumber IS NULL
        AND ts.start >= datetime('now')
        ORDER BY ts.start
        LIMIT 10
      `;

      console.log(`Encontradas ${smallSlots.length} clases sin pista asignada:\n`);
      
      smallSlots.forEach((slot, index) => {
        const date = new Date(slot.start);
        const bookedCount = Number(slot.bookingsCount);
        console.log(`${index + 1}. ID: ${slot.id.substring(0, 25)}...`);
        console.log(`   📅 ${date.toLocaleDateString('es-ES')} ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`);
        console.log(`   👥 ${bookedCount}/${slot.maxPlayers} jugadores`);
        console.log(`   🏢 ${slot.clubName}`);
        console.log(`   📊 Nivel: ${slot.level}`);
        console.log(`   🎾 Pista: ${slot.courtNumber || 'Sin asignar'}`);
        console.log('');
      });
    } else {
      console.log(`✅ Encontradas ${slots.length} clases con maxPlayers = 1:\n`);
      
      slots.forEach((slot, index) => {
        const date = new Date(slot.start);
        const bookedCount = Number(slot.bookingsCount);
        console.log(`${index + 1}. ID: ${slot.id.substring(0, 25)}...`);
        console.log(`   📅 ${date.toLocaleDateString('es-ES')} ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`);
        console.log(`   👥 ${bookedCount}/${slot.maxPlayers} jugadores`);
        console.log(`   🏢 ${slot.clubName}`);
        console.log(`   📊 Nivel: ${slot.level}`);
        console.log(`   🎾 Pista: ${slot.courtNumber || 'Sin asignar'}`);
        console.log('');
      });
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSinglePlayerClasses();
