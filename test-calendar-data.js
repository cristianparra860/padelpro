const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCalendarData() {
  console.log('\n📅 PRUEBA DEL CALENDARIO DEL CLUB\n');
  console.log('='.repeat(60));

  try {
    const clubId = 'club-1';
    const startDate = new Date().toISOString();
    const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    console.log('\n📊 Parámetros:');
    console.log(`   Club ID: ${clubId}`);
    console.log(`   Fecha inicio: ${startDate.split('T')[0]}`);
    console.log(`   Fecha fin: ${endDate.split('T')[0]}`);

    // 1. Pistas
    console.log('\n🎾 Pistas del club:');
    const courts = await prisma.$queryRaw`
      SELECT 
        c.id,
        c.number,
        c.name,
        c.isActive
      FROM Court c
      WHERE c.isActive = 1
      ORDER BY c.number
    `;
    console.log(`   Total: ${courts.length} pistas`);
    courts.forEach(court => {
      console.log(`   - Pista ${court.number}: ${court.name}`);
    });

    // 2. Instructores
    console.log('\n👨‍🏫 Instructores activos:');
    const instructors = await prisma.$queryRaw`
      SELECT 
        i.id,
        u.name,
        u.email,
        i.hourlyRate,
        i.specialties
      FROM Instructor i
      LEFT JOIN User u ON i.userId = u.id
      WHERE i.isActive = 1
      ORDER BY u.name
    `;
    console.log(`   Total: ${instructors.length} instructores`);
    instructors.forEach(inst => {
      console.log(`   - ${inst.name} (€${inst.hourlyRate}/h) - ${inst.specialties || 'N/A'}`);
    });

    // 3. Clases próximos 30 días
    console.log('\n📚 Clases en los próximos 30 días:');
    const classes = await prisma.$queryRaw`
      SELECT 
        ts.id,
        ts.start,
        ts.end,
        ts.level,
        ts.maxPlayers,
        ts.courtNumber,
        u.name as instructorName,
        (SELECT COUNT(*) FROM Booking WHERE timeSlotId = ts.id AND status = 'CONFIRMED') as totalPlayers
      FROM TimeSlot ts
      LEFT JOIN Instructor i ON ts.instructorId = i.id
      LEFT JOIN User u ON i.userId = u.id
      WHERE date(ts.start) >= date(${startDate})
      AND date(ts.start) <= date(${endDate})
      ORDER BY ts.start
    `;
    console.log(`   Total: ${classes.length} clases`);
    
    const proposed = classes.filter(c => !c.courtNumber);
    const confirmed = classes.filter(c => c.courtNumber);
    
    console.log(`   - Propuestas: ${proposed.length}`);
    console.log(`   - Confirmadas: ${confirmed.length}`);
    
    if (classes.length > 0) {
      console.log('\n   Primeras 5 clases:');
      classes.slice(0, 5).forEach(cls => {
        const date = new Date(cls.start).toLocaleDateString('es-ES');
        const time = new Date(cls.start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        const status = cls.courtNumber ? `Pista ${cls.courtNumber}` : 'Propuesta';
        console.log(`   ${date} ${time} - ${cls.level || 'Abierta'} (${cls.totalPlayers}/${cls.maxPlayers}) - ${status} - ${cls.instructorName}`);
      });
    }

    // 4. Partidos
    console.log('\n🏆 Partidos programados:');
    const matches = await prisma.$queryRaw`
      SELECT 
        m.id,
        m.startTime,
        m.endTime,
        m.status,
        c.number as courtNumber
      FROM Match m
      LEFT JOIN Court c ON m.courtId = c.id
      WHERE date(m.startTime) >= date(${startDate})
      AND date(m.startTime) <= date(${endDate})
      ORDER BY m.startTime
    `;
    console.log(`   Total: ${matches.length} partidos`);
    
    if (matches.length > 0) {
      console.log('\n   Próximos partidos:');
      matches.slice(0, 5).forEach(match => {
        const date = new Date(match.startTime).toLocaleDateString('es-ES');
        const startTime = new Date(match.startTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        const endTime = new Date(match.endTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        console.log(`   ${date} ${startTime} - ${endTime} - Pista ${match.courtNumber} (${match.status})`);
      });
    }

    // 5. Horarios bloqueados
    console.log('\n🚫 Horarios bloqueados:');
    
    const instructorSchedules = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM InstructorSchedule
      WHERE date(date) >= date(${startDate})
      AND date(date) <= date(${endDate})
      AND isOccupied = 1
    `;
    
    const courtSchedules = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM CourtSchedule
      WHERE date(date) >= date(${startDate})
      AND date(date) <= date(${endDate})
      AND isOccupied = 1
    `;
    
    console.log(`   - Instructores bloqueados: ${instructorSchedules[0]?.count || 0}`);
    console.log(`   - Pistas bloqueadas: ${courtSchedules[0]?.count || 0}`);

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ DATOS DE PRUEBA COMPLETOS\n');
    console.log('📋 Para ver el calendario:');
    console.log('   1. Asegúrate de que el servidor esté corriendo (npm run dev)');
    console.log('   2. Ve a: http://localhost:9002/admin/calendar');
    console.log('   3. Verás:');
    console.log('      - Vista mensual/semanal/diaria');
    console.log('      - Filtros por tipo de evento');
    console.log('      - Filtros por instructor o pista específica');
    console.log('      - Click en eventos para ver detalles\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testCalendarData();
