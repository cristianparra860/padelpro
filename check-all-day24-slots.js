const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllSlots() {
  try {
    // Total día 24
    const totalDay = await prisma.timeSlot.count({
      where: {
        start: {
          gte: new Date('2025-11-24T00:00:00.000Z'),
          lte: new Date('2025-11-24T23:59:59.999Z')
        }
      }
    });
    
    // Total 06:00 UTC
    const total7AM = await prisma.timeSlot.count({
      where: {
        start: new Date('2025-11-24T06:00:00.000Z')
      }
    });
    
    // Tarjetas 06:00 por prefijo de ID
    const slots7AM = await prisma.timeSlot.findMany({
      where: {
        start: new Date('2025-11-24T06:00:00.000Z')
      },
      select: {
        id: true,
        level: true,
        courtId: true,
        instructor: {
          select: {
            name: true
          }
        }
      }
    });
    
    const oldSlots = slots7AM.filter(s => s.id.startsWith('ts_'));
    const newSlots = slots7AM.filter(s => s.id.startsWith('c'));
    
    console.log('\n📊 Tarjetas del día 24 de noviembre:');
    console.log(`   Total del día: ${totalDay}`);
    console.log(`   Total a las 06:00 UTC (7:00 España): ${total7AM}`);
    console.log('');
    console.log(`📝 A las 06:00 UTC hay:`);
    console.log(`   Tarjetas VIEJAS (ts_...): ${oldSlots.length}`);
    console.log(`   Tarjetas NUEVAS (c...): ${newSlots.length}`);
    console.log('');
    
    if (oldSlots.length > 0) {
      console.log('🗑️  TARJETAS VIEJAS (deberían eliminarse):');
      oldSlots.forEach(s => {
        console.log(`   - ${s.instructor.name} | ${s.level} | courtId: ${s.courtId ? 'YES' : 'NULL'}`);
      });
      console.log('');
    }
    
    if (newSlots.length > 0) {
      console.log('✨ TARJETAS NUEVAS (correctas):');
      const byInstructor = {};
      newSlots.forEach(s => {
        const name = s.instructor.name;
        if (!byInstructor[name]) byInstructor[name] = [];
        byInstructor[name].push(s);
      });
      
      Object.entries(byInstructor).forEach(([name, cards]) => {
        console.log(`   - ${name}: ${cards.length} tarjeta(s)`);
        cards.forEach(c => {
          console.log(`      • ${c.level} | courtId: ${c.courtId ? 'YES' : 'NULL'}`);
        });
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllSlots();
