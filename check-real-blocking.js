// Verificar bloqueos reales después de una reserva

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRealBlocking() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 VERIFICACIÓN DE BLOQUEOS REALES');
  console.log('='.repeat(80));
  console.log('');

  try {
    // Ver las últimas clases confirmadas con sus horarios
    const confirmedClasses = await prisma.timeSlot.findMany({
      where: { courtId: { not: null } },
      include: {
        instructor: { include: { user: true } },
        court: true
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    console.log('📊 ÚLTIMAS CLASES CONFIRMADAS:\n');
    
    for (const cls of confirmedClasses) {
      const start = new Date(cls.start);
      const end = new Date(cls.end);
      const duration = (end - start) / (1000 * 60);
      
      console.log(`🟢 Clase: ${cls.id.substring(0, 15)}...`);
      console.log(`   Instructor: ${cls.instructor?.user?.name}`);
      console.log(`   Pista: ${cls.court?.number}`);
      console.log(`   Inicio: ${start.toLocaleString('es-ES')}`);
      console.log(`   Fin:    ${end.toLocaleString('es-ES')}`);
      console.log(`   Duración clase: ${duration} minutos`);
      
      // Buscar propuestas del mismo instructor en horarios cercanos
      const startTime = start.getTime();
      const endTime = end.getTime();
      
      // Buscar propuestas 1 hora antes y 1 hora después
      const searchStart = new Date(startTime - 60 * 60 * 1000);
      const searchEnd = new Date(endTime + 60 * 60 * 1000);
      
      const nearbyProposals = await prisma.timeSlot.findMany({
        where: {
          instructorId: cls.instructorId,
          courtId: null,
          start: {
            gte: searchStart,
            lte: searchEnd
          }
        },
        orderBy: { start: 'asc' }
      });
      
      console.log(`\n   📋 Propuestas del instructor alrededor de esta clase:`);
      
      if (nearbyProposals.length === 0) {
        console.log('      ✅ No hay propuestas (todas eliminadas/bloqueadas correctamente)');
      } else {
        nearbyProposals.forEach(prop => {
          const propStart = new Date(prop.start);
          const propEnd = new Date(prop.end);
          const propTime = propStart.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
          
          // Verificar si está dentro del rango bloqueado
          const propStartTime = propStart.getTime();
          const isInside = propStartTime >= startTime && propStartTime < endTime;
          const isJustAfter = propStartTime === endTime;
          
          if (isInside) {
            console.log(`      ⚠️  ${propTime} - DENTRO de la clase (DEBERÍA ESTAR ELIMINADA)`);
          } else if (isJustAfter) {
            console.log(`      ✅ ${propTime} - Justo después (correcto que exista)`);
          } else if (propStartTime < startTime) {
            console.log(`      ✅ ${propTime} - Antes de la clase (correcto que exista)`);
          } else {
            console.log(`      ✅ ${propTime} - Después de la clase (correcto que exista)`);
          }
        });
      }
      
      console.log('\n' + '-'.repeat(80) + '\n');
    }

    // Verificar si hay problema de generación de propuestas en intervalos
    console.log('🔍 VERIFICANDO INTERVALOS DE PROPUESTAS:\n');
    
    const allProposals = await prisma.timeSlot.findMany({
      where: {
        courtId: null,
        start: {
          gte: new Date('2025-10-29T09:00:00.000Z'),
          lte: new Date('2025-10-29T12:00:00.000Z')
        }
      },
      orderBy: { start: 'asc' },
      take: 10
    });

    if (allProposals.length > 0) {
      console.log('   Primeras 10 propuestas del día de hoy (9:00-12:00):\n');
      
      let lastTime = null;
      allProposals.forEach(prop => {
        const start = new Date(prop.start);
        const end = new Date(prop.end);
        const duration = (end - start) / (1000 * 60);
        const time = start.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        
        let interval = '';
        if (lastTime) {
          const diff = (start - lastTime) / (1000 * 60);
          interval = ` (${diff} min después)`;
        }
        
        console.log(`   ${time} - Duración: ${duration} min${interval}`);
        lastTime = start;
      });
    }

    console.log('\n' + '='.repeat(80));

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkRealBlocking();
