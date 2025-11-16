const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSpecific8amSlots() {
  try {
    console.log('🔍 VERIFICANDO SLOTS DE 8:00 Y 8:30\n');
    
    // Próximos 7 días
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    // Buscar todos los slots de 8:00
    const slots8am = await prisma.timeSlot.findMany({
      where: {
        start: {
          gte: today,
          lt: nextWeek
        }
      },
      select: {
        id: true,
        start: true,
        instructorId: true,
        courtNumber: true
      },
      orderBy: {
        start: 'asc'
      }
    });
    
    console.log(`Total slots en próximos 7 días: ${slots8am.length}\n`);
    
    // Filtrar solo los de 8:00 y 8:30
    const morningSlots = slots8am.filter(s => {
      const d = new Date(s.start);
      const hour = d.getHours();
      const min = d.getMinutes();
      return (hour === 8 && (min === 0 || min === 30));
    });
    
    console.log(`Slots de 8:00-8:30: ${morningSlots.length}`);
    
    // Agrupar por día
    const byDay = {};
    
    for (const slot of morningSlots) {
      const d = new Date(slot.start);
      const day = d.toLocaleDateString('es-ES');
      const time = `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
      
      if (!byDay[day]) {
        byDay[day] = { '8:00': 0, '8:30': 0 };
      }
      
      byDay[day][time]++;
    }
    
    console.log('\n📅 SLOTS POR DÍA:\n');
    
    for (const [day, times] of Object.entries(byDay)) {
      console.log(`${day}:`);
      console.log(`  8:00 → ${times['8:00']} slots`);
      console.log(`  8:30 → ${times['8:30']} slots`);
    }
    
    // Verificar si HOY tiene slots de 8:00/8:30
    console.log(`\n🔍 HOY (${today.toLocaleDateString('es-ES')}):`);
    
    const todayEnd = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    
    const today8am = await prisma.timeSlot.findMany({
      where: {
        start: {
          gte: today,
          lt: todayEnd
        }
      },
      select: {
        start: true,
        instructorId: true,
        courtNumber: true
      }
    });
    
    const today8amFiltered = today8am.filter(s => {
      const d = new Date(s.start);
      return (d.getHours() === 8 && (d.getMinutes() === 0 || d.getMinutes() === 30));
    });
    
    console.log(`  Slots 8:00-8:30 hoy: ${today8amFiltered.length}`);
    
    if (today8amFiltered.length === 0) {
      console.log('\n  ⚠️ NO HAY SLOTS DE 8:00-8:30 PARA HOY!');
      console.log('  Verificando todos los horarios de hoy...\n');
      
      const allToday = today8am.map(s => {
        const d = new Date(s.start);
        return `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
      });
      
      const unique = [...new Set(allToday)].sort();
      console.log(`  Horarios disponibles: ${unique.join(', ')}`);
      
      // Verificar qué falta
      const shouldHave = [];
      for (let h = 8; h < 22; h++) {
        for (const m of [0, 30]) {
          shouldHave.push(`${h}:${m.toString().padStart(2, '0')}`);
        }
      }
      
      const missing = shouldHave.filter(t => !unique.includes(t));
      if (missing.length > 0) {
        console.log(`\n  ❌ FALTAN: ${missing.join(', ')}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSpecific8amSlots();
