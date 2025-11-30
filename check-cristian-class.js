const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCristianClass() {
  try {
    console.log('\n🔍 BUSCANDO CLASE DE CRISTIAN PARRA - 30 NOV 09:00\n');
    
    // Buscar el instructor
    const cristian = await prisma.instructor.findFirst({
      where: {
        user: {
          name: { contains: 'Cristian Parra' }
        }
      },
      include: {
        user: { select: { name: true } }
      }
    });
    
    if (!cristian) {
      console.log('❌ No se encontró el instructor Cristian Parra');
      return;
    }
    
    console.log(`✅ Instructor encontrado: ${cristian.user.name} (ID: ${cristian.id})`);
    
    // Buscar clases del 30 de noviembre a las 9:00
    const targetDate = new Date('2025-11-30T09:00:00.000Z');
    const targetTimestamp = targetDate.getTime();
    
    console.log(`\n📅 Buscando clases en: ${targetDate.toISOString()}`);
    console.log(`   Timestamp: ${targetTimestamp}\n`);
    
    // Buscar todas las clases de Cristian en esa fecha/hora
    const classes = await prisma.timeSlot.findMany({
      where: {
        instructorId: cristian.id,
        start: targetTimestamp
      },
      include: {
        court: { select: { id: true, number: true } },
        bookings: {
          where: {
            status: { in: ['PENDING', 'CONFIRMED'] }
          },
          include: {
            user: { select: { id: true, name: true, email: true } }
          }
        }
      }
    });
    
    console.log(`📊 Clases encontradas: ${classes.length}\n`);
    
    if (classes.length === 0) {
      console.log('❌ No hay clases de Cristian Parra el 30/11 a las 9:00');
      return;
    }
    
    classes.forEach((cls, index) => {
      const isConfirmed = cls.courtId !== null;
      const marcBooking = cls.bookings.find(b => 
        b.user.email.includes('marc') || b.user.email.includes('jugador1')
      );
      
      console.log(`\n${index + 1}. Clase ${cls.id.substring(0, 20)}...`);
      console.log(`   Estado: ${isConfirmed ? '✅ CONFIRMADA (con pista)' : '🟠 PROPUESTA (sin pista)'}`);
      console.log(`   courtId: ${cls.courtId || 'NULL'}`);
      if (cls.court) {
        console.log(`   Pista número: ${cls.court.number}`);
      }
      console.log(`   Nivel: ${cls.level}`);
      console.log(`   Categoría: ${cls.category}`);
      console.log(`   Max jugadores: ${cls.maxPlayers}`);
      console.log(`   Bookings: ${cls.bookings.length}`);
      
      if (cls.bookings.length > 0) {
        console.log(`   Jugadores inscritos:`);
        cls.bookings.forEach(b => {
          const icon = (b.user.email.includes('marc') || b.user.email.includes('jugador1')) ? '⭐' : '  ';
          console.log(`     ${icon} ${b.user.name} (${b.status}, grupo: ${b.groupSize})`);
        });
      }
      
      if (marcBooking) {
        console.log(`\n   🎯 Marc Parra ESTÁ inscrito en esta clase`);
      }
    });
    
    // Verificar qué devolvería el API para esta fecha
    console.log('\n\n📡 SIMULANDO LLAMADA AL API /api/timeslots\n');
    
    const apiDate = '2025-11-30';
    const startOfDay = new Date(apiDate + 'T00:00:00.000Z');
    const endOfDay = new Date(apiDate + 'T23:59:59.999Z');
    const startTimestamp = startOfDay.getTime();
    const endTimestamp = endOfDay.getTime();
    
    const apiQuery = `SELECT * FROM TimeSlot WHERE clubId = ? AND start >= ? AND start <= ? ORDER BY start ASC`;
    const apiResults = await prisma.$queryRawUnsafe(
      apiQuery,
      'padel-estrella-madrid',
      startTimestamp,
      endTimestamp
    );
    
    console.log(`Total TimeSlots del día 30/11: ${apiResults.length}`);
    
    // Filtrar por Cristian
    const cristianSlots = apiResults.filter(slot => slot.instructorId === cristian.id && slot.start === targetTimestamp);
    console.log(`TimeSlots de Cristian a las 9:00: ${cristianSlots.length}`);
    
    if (cristianSlots.length > 0) {
      console.log('\n✅ El API SÍ devuelve estas clases:');
      cristianSlots.forEach(slot => {
        console.log(`   - ID: ${slot.id.substring(0, 20)}... | courtId: ${slot.courtId || 'NULL'} | level: ${slot.level}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCristianClass();
