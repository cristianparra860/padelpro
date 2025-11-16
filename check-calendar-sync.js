const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCalendarSync() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayISO = today.toISOString();
    const tomorrowISO = tomorrow.toISOString();
    
    console.log('🔍 Verificando sincronización del calendario para HOY:', today.toLocaleDateString('es-ES'));
    console.log('   Rango ISO:', todayISO, 'hasta', tomorrowISO);
    
    // 1. Obtener clases confirmadas (con pista asignada)
    const confirmedClasses = await prisma.timeSlot.findMany({
      where: {
        start: {
          gte: todayISO,
          lt: tomorrowISO
        },
        courtId: { not: null }
      },
      include: {
        bookings: {
          where: {
            status: { in: ['PENDING', 'CONFIRMED'] }
          },
          include: {
            user: {
              select: { name: true }
            }
          }
        },
        instructor: {
          include: {
            user: {
              select: { name: true }
            }
          }
        },
        court: true
      },
      orderBy: { start: 'asc' }
    });
    
    // 2. Obtener propuestas (sin pista asignada)
    const proposalClasses = await prisma.timeSlot.findMany({
      where: {
        start: {
          gte: todayISO,
          lt: tomorrowISO
        },
        courtId: null
      },
      include: {
        bookings: {
          where: {
            status: { in: ['PENDING', 'CONFIRMED'] }
          }
        },
        instructor: {
          include: {
            user: {
              select: { name: true }
            }
          }
        }
      },
      orderBy: { start: 'asc' }
    });
    
    console.log('\n📊 RESUMEN:');
    console.log(`   ✅ Clases CONFIRMADAS (con pista): ${confirmedClasses.length}`);
    console.log(`   📋 Propuestas (sin pista): ${proposalClasses.length}`);
    console.log(`   📈 TOTAL: ${confirmedClasses.length + proposalClasses.length}`);
    
    if (confirmedClasses.length > 0) {
      console.log('\n✅ CLASES CONFIRMADAS (deberían aparecer en el calendario):');
      confirmedClasses.forEach((cls, i) => {
        const start = new Date(cls.start);
        const bookingsCount = cls.bookings?.length || 0;
        console.log(`   ${i + 1}. ${start.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - Pista ${cls.courtNumber} - ${cls.instructor?.user?.name || 'Sin instructor'} - ${cls.level || 'Sin nivel'} - ${bookingsCount}/${cls.maxPlayers} jugadores`);
        
        if (bookingsCount > 0) {
          cls.bookings.forEach((booking, j) => {
            console.log(`      ${j + 1}. ${booking.user.name} (${booking.status})`);
          });
        }
      });
    }
    
    if (proposalClasses.length > 0) {
      console.log('\n📋 PROPUESTAS (deberían aparecer en tarjetas de instructores):');
      
      // Agrupar por instructor
      const byInstructor = {};
      proposalClasses.forEach(cls => {
        const instructorName = cls.instructor?.user?.name || 'Sin instructor';
        if (!byInstructor[instructorName]) {
          byInstructor[instructorName] = [];
        }
        byInstructor[instructorName].push(cls);
      });
      
      Object.entries(byInstructor).forEach(([instructorName, classes]) => {
        console.log(`\n   👨‍🏫 ${instructorName}: ${classes.length} propuestas`);
        classes.slice(0, 5).forEach((cls, i) => {
          const start = new Date(cls.start);
          const bookingsCount = cls.bookings?.length || 0;
          console.log(`      ${i + 1}. ${start.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - ${cls.level || 'Sin nivel'} - ${bookingsCount}/${cls.maxPlayers} jugadores`);
        });
        if (classes.length > 5) {
          console.log(`      ... y ${classes.length - 5} más`);
        }
      });
    }
    
    // 3. Verificar si hay clases "fantasma" (con courtNumber pero sin courtId)
    const ghostClasses = await prisma.timeSlot.findMany({
      where: {
        start: {
          gte: todayISO,
          lt: tomorrowISO
        },
        courtNumber: { not: null },
        courtId: null
      }
    });
    
    if (ghostClasses.length > 0) {
      console.log('\n⚠️ CLASES FANTASMA DETECTADAS (courtNumber pero sin courtId):');
      console.log(`   ${ghostClasses.length} clases con datos inconsistentes`);
      ghostClasses.forEach((cls, i) => {
        const start = new Date(cls.start);
        console.log(`   ${i + 1}. ${start.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - courtNumber: ${cls.courtNumber}, courtId: ${cls.courtId}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCalendarSync();
