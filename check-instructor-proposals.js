// Verificar distribución de propuestas por instructor y horarios

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkInstructorProposals() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 VERIFICACIÓN DE PROPUESTAS POR INSTRUCTOR Y HORARIOS');
  console.log('='.repeat(80));
  console.log('');

  try {
    // Obtener todos los instructores
    const instructors = await prisma.instructor.findMany({
      include: {
        user: true
      }
    });

    console.log(`📊 Total Instructores: ${instructors.length}\n`);

    // Para cada instructor, verificar sus propuestas
    for (const instructor of instructors) {
      console.log('='.repeat(80));
      console.log(`👤 INSTRUCTOR: ${instructor.user.name}`);
      console.log('='.repeat(80));

      // Obtener todas las propuestas de este instructor
      const proposals = await prisma.timeSlot.findMany({
        where: {
          instructorId: instructor.id,
          courtId: null, // Solo propuestas
          start: {
            gte: new Date('2025-10-29T00:00:00.000Z'),
            lte: new Date('2025-11-05T23:59:59.999Z') // Una semana
          }
        },
        orderBy: {
          start: 'asc'
        }
      });

      console.log(`\n🔶 Total Propuestas: ${proposals.length}`);

      if (proposals.length === 0) {
        console.log('❌ PROBLEMA: Este instructor NO tiene propuestas de clases');
        continue;
      }

      // Agrupar por día
      const proposalsByDay = {};
      proposals.forEach(proposal => {
        const date = new Date(proposal.start);
        const dayKey = date.toISOString().split('T')[0];
        
        if (!proposalsByDay[dayKey]) {
          proposalsByDay[dayKey] = [];
        }
        
        proposalsByDay[dayKey].push({
          time: date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
          level: proposal.level,
          category: proposal.category
        });
      });

      // Mostrar distribución por día
      console.log('\n📅 Distribución por día:\n');
      
      const days = Object.keys(proposalsByDay).sort();
      for (const day of days) {
        const dayProposals = proposalsByDay[day];
        const date = new Date(day);
        const dayName = date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
        
        console.log(`   ${dayName}: ${dayProposals.length} propuestas`);
        
        // Mostrar horarios
        const times = dayProposals.map(p => p.time);
        console.log(`   Horarios: ${times.join(', ')}`);
        console.log('');
      }

      // Verificar rango de horarios
      const allTimes = proposals.map(p => {
        const date = new Date(p.start);
        return date.getHours() * 60 + date.getMinutes();
      });

      const minTime = Math.min(...allTimes);
      const maxTime = Math.max(...allTimes);
      
      const minHour = Math.floor(minTime / 60);
      const maxHour = Math.floor(maxTime / 60);

      console.log(`⏰ Rango de horarios: ${minHour}:00 - ${maxHour}:00`);
      
      // Verificar si hay huecos en los horarios
      const uniqueHours = [...new Set(allTimes.map(t => Math.floor(t / 60)))].sort((a, b) => a - b);
      console.log(`📊 Horas con propuestas: ${uniqueHours.join('h, ')}h`);
      
      if (uniqueHours.length < 8) {
        console.log(`⚠️  ADVERTENCIA: Solo tiene propuestas en ${uniqueHours.length} horas diferentes`);
        console.log(`   Se esperarían más horarios distribuidos durante el día`);
      } else {
        console.log(`✅ Buena distribución de horarios`);
      }
      
      console.log('');
    }

    // Resumen general
    console.log('='.repeat(80));
    console.log('📋 RESUMEN GENERAL');
    console.log('='.repeat(80));
    console.log('');

    for (const instructor of instructors) {
      const proposalCount = await prisma.timeSlot.count({
        where: {
          instructorId: instructor.id,
          courtId: null,
          start: {
            gte: new Date('2025-10-29T00:00:00.000Z'),
            lte: new Date('2025-11-05T23:59:59.999Z')
          }
        }
      });

      const icon = proposalCount > 0 ? '✅' : '❌';
      console.log(`${icon} ${instructor.user.name}: ${proposalCount} propuestas en la próxima semana`);
    }

    console.log('');
    console.log('='.repeat(80));

    // Verificar API para ver qué se muestra en el calendario
    console.log('\n🔍 Verificando qué muestra el API del calendario...\n');
    
    try {
      const response = await fetch('http://localhost:9002/api/admin/calendar?clubId=club-1&startDate=2025-10-29T00:00:00.000Z&endDate=2025-11-05T23:59:59.999Z');
      const data = await response.json();
      
      console.log(`📊 API Calendar muestra:`);
      console.log(`   🔶 Propuestas: ${data.summary.proposedClasses}`);
      console.log(`   🟢 Confirmadas: ${data.summary.confirmedClasses}`);
      
      // Contar propuestas por instructor en el API
      const proposalEvents = data.events.filter(e => e.type === 'class-proposal');
      const proposalsByInstructor = {};
      
      proposalEvents.forEach(event => {
        const instructorName = event.instructorName || 'Sin instructor';
        proposalsByInstructor[instructorName] = (proposalsByInstructor[instructorName] || 0) + 1;
      });
      
      console.log('\n📊 Propuestas por instructor en el calendario:');
      for (const [name, count] of Object.entries(proposalsByInstructor)) {
        console.log(`   ${name}: ${count} propuestas visibles`);
      }
      
    } catch (e) {
      console.log(`⚠️  No se pudo verificar el API: ${e.message}`);
    }

    console.log('\n' + '='.repeat(80));

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkInstructorProposals();
