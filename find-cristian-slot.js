const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findCristianSlot() {
  try {
    console.log('\n🔍 Buscando Cristian Parra...\n');
    
    // Buscar instructor
    const instructors = await prisma.instructor.findMany({
      where: {
        name: {
          contains: 'Cristian'
        }
      }
    });
    
    if (instructors.length === 0) {
      // Probar con Cristián (tilde)
      const instructors2 = await prisma.instructor.findMany({
        where: {
          name: {
            contains: 'Cristi'
          }
        }
      });
      
      if (instructors2.length > 0) {
        console.log('Instructores encontrados:', instructors2.map(i => ({id: i.id, name: i.name})));
        
        const instructorId = instructors2[0].id;
        
        // Buscar slots del 27
        const startTimestamp = new Date('2025-12-27T00:00:00Z').getTime();
        const endTimestamp = new Date('2025-12-28T00:00:00Z').getTime();
        
        const slots = await prisma.$queryRaw`
          SELECT * FROM TimeSlot
          WHERE instructorId = ${instructorId}
          AND start >= ${startTimestamp}
          AND start < ${endTimestamp}
          ORDER BY start
        `;
        
        console.log(`\n📊 Slots encontrados: ${slots.length}\n`);
        
        for (const slot of slots) {
          console.log('─'.repeat(80));
          const hora = new Date(slot.start).toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'});
          console.log(`⏰ ${hora} - ID: ${slot.id.substring(0, 20)}...`);
          console.log(`   level: "${slot.level}"`);
          console.log(`   levelRange: "${slot.levelRange}"`);
          console.log(`   genderCategory: "${slot.genderCategory}"`);
          console.log(`   courtNumber: ${slot.courtNumber}`);
          
          // Bookings
          const bookings = await prisma.$queryRaw`
            SELECT b.*, u.name as userName
            FROM Booking b
            LEFT JOIN User u ON b.userId = u.id
            WHERE b.timeSlotId = ${slot.id}
            ORDER BY b.createdAt DESC
          `;
          
          console.log(`   Bookings: ${bookings.length}`);
          bookings.forEach((b, i) => {
            console.log(`      ${i+1}. [${b.status}] ${b.userName} (${b.groupSize}p)`);
          });
        }
        
      } else {
        console.log('❌ No se encontró ningún Cristian/Cristián');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findCristianSlot();
