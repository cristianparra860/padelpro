const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRestrictions() {
  try {
    console.log('🔍 VERIFICANDO RESTRICCIONES DEL CLUB Y INSTRUCTORES\n');

    // 1. Verificar restricciones del club
    console.log('📅 1. RESTRICCIONES DEL CLUB:');
    const clubSchedules = await prisma.clubSchedule.findMany({
      where: { clubId: 'padel-estrella-madrid' }
    });

    if (clubSchedules.length === 0) {
      console.log('   ✅ No hay restricciones de horario del club');
    } else {
      clubSchedules.forEach(schedule => {
        console.log(`   - ${schedule.dayOfWeek}:`);
        console.log(`     Cerrado: ${schedule.isClosed ? 'SÍ ❌' : 'NO ✅'}`);
        if (schedule.openTime && schedule.closeTime) {
          console.log(`     Horario: ${schedule.openTime} - ${schedule.closeTime}`);
        }
      });
    }

    // 2. Verificar restricciones de instructores
    console.log('\n👥 2. RESTRICCIONES DE INSTRUCTORES:\n');
    const instructors = await prisma.instructor.findMany({
      where: { clubId: 'padel-estrella-madrid' }
    });

    console.log(`   Total instructores: ${instructors.length}\n`);

    for (const instructor of instructors) {
      console.log(`   📌 ${instructor.name} (${instructor.id}):`);
      console.log(`      Disponible: ${instructor.isAvailable ? 'SÍ ✅' : 'NO ❌'}`);
      
      // Verificar unavailableHours (JSON en la tabla)
      if (instructor.unavailableHours && typeof instructor.unavailableHours === 'object') {
        const unavailable = instructor.unavailableHours;
        const days = Object.keys(unavailable);
        
        if (days.length > 0) {
          console.log('      Horarios NO disponibles:');
          days.forEach(day => {
            const hours = unavailable[day];
            if (hours && hours.length > 0) {
              console.log(`        - ${day}: ${hours.join(', ')}`);
            }
          });
        } else {
          console.log('      ✅ Sin restricciones personales');
        }
      } else {
        console.log('      ✅ Sin restricciones personales');
      }

      // Verificar InstructorSchedule (horarios bloqueados)
      const blockedSlots = await prisma.instructorSchedule.findMany({
        where: {
          instructorId: instructor.id,
          isOccupied: true
        }
      });

      if (blockedSlots.length > 0) {
        console.log(`      ⚠️ Horarios bloqueados en InstructorSchedule: ${blockedSlots.length}`);
        blockedSlots.slice(0, 3).forEach(slot => {
          console.log(`        - ${slot.dayOfWeek} ${slot.startTime}-${slot.endTime}`);
        });
        if (blockedSlots.length > 3) {
          console.log(`        ... y ${blockedSlots.length - 3} más`);
        }
      }
      
      console.log('');
    }

    // 3. Verificar pistas del club
    console.log('🎾 3. PISTAS DEL CLUB:\n');
    const courts = await prisma.court.findMany({
      where: { clubId: 'padel-estrella-madrid' }
    });

    console.log(`   Total pistas: ${courts.length}`);
    courts.forEach(court => {
      console.log(`   - Pista ${court.number}: ${court.name}`);
    });

    // 4. Contar propuestas actuales
    console.log('\n📊 4. PROPUESTAS ACTUALES:\n');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const totalProposals = await prisma.timeSlot.count({
      where: {
        clubId: 'padel-estrella-madrid',
        courtId: null,
        start: { gte: today }
      }
    });

    console.log(`   Total propuestas futuras: ${totalProposals}`);

    // Propuestas por día (próximos 7 días)
    for (let i = 0; i < 7; i++) {
      const dayStart = new Date(today);
      dayStart.setDate(today.getDate() + i);
      
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const dayCount = await prisma.timeSlot.count({
        where: {
          clubId: 'padel-estrella-madrid',
          courtId: null,
          start: {
            gte: dayStart,
            lte: dayEnd
          }
        }
      });

      console.log(`   ${dayStart.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: '2-digit' })}: ${dayCount} propuestas`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRestrictions();
