const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug30MinBlocking() {
  try {
    console.log('🔍 ANALIZANDO BLOQUEOS 30MIN\n');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    
    // 1. Verificar si hay clases CONFIRMADAS (con pista asignada)
    const confirmedClasses = await prisma.timeSlot.findMany({
      where: {
        start: {
          gte: today,
          lt: tomorrow
        },
        courtNumber: {
          not: null
        }
      },
      select: {
        id: true,
        start: true,
        end: true,
        courtNumber: true,
        instructorId: true,
        bookings: {
          where: {
            status: {
              in: ['PENDING', 'CONFIRMED']
            }
          }
        }
      },
      orderBy: {
        start: 'asc'
      }
    });
    
    console.log(`📋 Clases CONFIRMADAS (con pista): ${confirmedClasses.length}`);
    
    if (confirmedClasses.length > 0) {
      console.log('\n⚠️ CLASES CONFIRMADAS ENCONTRADAS:\n');
      for (const cls of confirmedClasses) {
        const start = new Date(cls.start);
        const end = new Date(cls.end);
        const activeBookings = cls.bookings.length;
        
        console.log(`  📍 Pista ${cls.courtNumber} | ${start.toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'})} - ${end.toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'})}`);
        console.log(`     Reservas activas: ${activeBookings}`);
        console.log(`     ID: ${cls.id.substring(0, 20)}...`);
        
        // Verificar propuestas 30min antes
        const thirtyMinBefore = new Date(start.getTime() - 30 * 60 * 1000);
        const oneHourBefore = new Date(start.getTime() - 60 * 60 * 1000);
        
        console.log(`     Bloquea: ${oneHourBefore.toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'})} - ${thirtyMinBefore.toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'})}`);
        
        // Buscar si existen propuestas en ese rango
        const blockedProposals = await prisma.timeSlot.findMany({
          where: {
            instructorId: cls.instructorId,
            start: {
              gte: oneHourBefore,
              lt: start
            },
            courtNumber: null
          },
          select: {
            id: true,
            start: true
          }
        });
        
        if (blockedProposals.length === 0) {
          console.log(`     ❌ NO HAY propuestas en ese rango (fueron eliminadas)\n`);
        } else {
          console.log(`     ✅ Existen ${blockedProposals.length} propuestas (bloqueadas por InstructorSchedule)\n`);
        }
      }
    }
    
    // 2. Verificar InstructorSchedule (clases confirmadas)
    const instructorSchedules = await prisma.instructorSchedule.findMany({
      where: {
        startTime: {
          gte: today,
          lt: tomorrow
        }
      },
      select: {
        id: true,
        instructorId: true,
        startTime: true,
        endTime: true,
        timeSlotId: true,
        isOccupied: true
      },
      orderBy: {
        startTime: 'asc'
      }
    });
    
    console.log(`\n📅 InstructorSchedule bloqueados: ${instructorSchedules.length}`);
    
    if (instructorSchedules.length > 0) {
      console.log('\nBLOQUEOS ACTIVOS:\n');
      for (const schedule of instructorSchedules) {
        const start = new Date(schedule.startTime);
        const end = new Date(schedule.endTime);
        console.log(`  ⏰ ${start.toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'})} - ${end.toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'})} | Ocupado: ${schedule.isOccupied}`);
      }
    }
    
    // 3. Verificar total de propuestas por instructor
    const instructors = await prisma.instructor.findMany({
      where: { isActive: true }
    });
    
    console.log(`\n\n👥 PROPUESTAS POR INSTRUCTOR (hoy):\n`);
    
    for (const instructor of instructors) {
      const proposals = await prisma.timeSlot.findMany({
        where: {
          instructorId: instructor.id,
          start: {
            gte: today,
            lt: tomorrow
          },
          courtNumber: null
        }
      });
      
      console.log(`  ${instructor.name}: ${proposals.length} propuestas`);
      
      // Verificar si faltan slots (debería haber 28: 8:00-21:30 cada 30min)
      if (proposals.length < 28) {
        console.log(`    ⚠️ FALTAN ${28 - proposals.length} propuestas!`);
        
        // Mostrar cuáles faltan
        const existingTimes = new Set(proposals.map(p => {
          const d = new Date(p.start);
          return `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
        }));
        
        const allTimes = [];
        for (let h = 8; h < 22; h++) {
          for (const m of [0, 30]) {
            allTimes.push(`${h}:${m.toString().padStart(2, '0')}`);
          }
        }
        
        const missing = allTimes.filter(t => !existingTimes.has(t));
        console.log(`    Faltan: ${missing.join(', ')}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debug30MinBlocking();
