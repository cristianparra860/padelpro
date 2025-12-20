const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSlot() {
  try {
    console.log('\n🔍 Buscando clases de Cristian Parra el 27 a las 09:00...\n');
    
    // Buscar el instructor
    const instructor = await prisma.$queryRaw`
      SELECT id, name FROM Instructor WHERE name LIKE '%Cristian%Parra%'
    `;
    
    if (!instructor || instructor.length === 0) {
      console.log('❌ No se encontró el instructor');
      return;
    }
    
    const instructorId = instructor[0].id;
    console.log(`👨‍🏫 Instructor: ${instructor[0].name} (${instructorId})`);
    
    // Buscar TimeSlots del 27 de diciembre a las 09:00
    const startDate = new Date('2025-12-27T09:00:00Z');
    const endDate = new Date('2025-12-27T10:00:00Z');
    const startTimestamp = startDate.getTime();
    const endTimestamp = endDate.getTime();
    
    console.log(`📅 Buscando slots entre ${startDate.toISOString()} y ${endDate.toISOString()}`);
    console.log(`📅 Timestamps: ${startTimestamp} - ${endTimestamp}\n`);
    
    const slots = await prisma.$queryRaw`
      SELECT * FROM TimeSlot
      WHERE instructorId = ${instructorId}
      AND start >= ${startTimestamp}
      AND start < ${endTimestamp}
    `;
    
    console.log(`📊 TimeSlots encontrados: ${slots.length}\n`);
    
    for (const slot of slots) {
      console.log('─'.repeat(80));
      console.log(`🎾 TimeSlot ID: ${slot.id}`);
      console.log(`   📅 Hora: ${new Date(slot.start).toLocaleString('es-ES')}`);
      console.log(`   🏷️  Nivel: ${slot.level || 'NULL'}`);
      console.log(`   🏷️  LevelRange: ${slot.levelRange || 'NULL'}`);
      console.log(`   👥 Categoría: ${slot.genderCategory || 'NULL'}`);
      console.log(`   🏟️  Pista: ${slot.courtNumber || 'NULL'}`);
      
      // Contar bookings activos
      const activeBookings = await prisma.$queryRaw`
        SELECT COUNT(*) as count FROM Booking
        WHERE timeSlotId = ${slot.id}
        AND status IN ('PENDING', 'CONFIRMED')
      `;
      
      const activeCount = activeBookings[0].count;
      
      console.log(`   👥 Bookings activos: ${activeCount}`);
      
      // Mostrar todos los bookings (incluso cancelados)
      const allBookings = await prisma.$queryRaw`
        SELECT b.*, u.name as userName, u.email
        FROM Booking b
        LEFT JOIN User u ON b.userId = u.id
        WHERE b.timeSlotId = ${slot.id}
        ORDER BY b.createdAt DESC
      `;
      
      if (allBookings.length > 0) {
        console.log(`\n   📋 Bookings (${allBookings.length}):`);
        allBookings.forEach((b, i) => {
          console.log(`      ${i+1}. ${b.status} - ${b.userName || 'Sin nombre'} (${b.email || 'Sin email'})`);
          console.log(`         GroupSize: ${b.groupSize}, Created: ${new Date(b.createdAt).toLocaleString('es-ES')}`);
        });
      }
      
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSlot();
