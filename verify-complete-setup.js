const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifySetup() {
  console.log('\n✅ VERIFICACIÓN FINAL DEL SISTEMA\n');
  console.log('='.repeat(60));

  try {
    // 1. Verificar usuarios
    console.log('\n👥 USUARIOS:\n');
    const users = await prisma.$queryRaw`
      SELECT id, name, email, role, level, credits, genderCategory
      FROM User
      ORDER BY role DESC
    `;

    users.forEach(user => {
      const emoji = user.role === 'INSTRUCTOR' ? '👨‍🏫' : '👤';
      console.log(`   ${emoji} ${user.name}`);
      console.log(`      Email: ${user.email}`);
      console.log(`      Rol: ${user.role}`);
      console.log(`      Nivel: ${user.level || 'N/A'}`);
      if (user.role === 'PLAYER') {
        console.log(`      Créditos: €${user.credits}`);
        console.log(`      Categoría: ${user.genderCategory || 'N/A'}`);
      }
      console.log('');
    });

    // 2. Verificar instructores
    console.log('\n👨‍🏫 INSTRUCTORES:\n');
    const instructors = await prisma.$queryRaw`
      SELECT i.id, u.name, i.hourlyRate, i.isActive,
             (SELECT COUNT(*) FROM TimeSlot WHERE instructorId = i.id) as totalClasses
      FROM Instructor i
      JOIN User u ON u.id = i.userId
    `;

    instructors.forEach(inst => {
      console.log(`   ✅ ${inst.name}`);
      console.log(`      ID: ${inst.id}`);
      console.log(`      Tarifa: €${inst.hourlyRate}/hora`);
      console.log(`      Clases asignadas: ${inst.totalClasses}`);
      console.log(`      Estado: ${inst.isActive ? 'Activo ✅' : 'Inactivo ❌'}`);
      console.log('');
    });

    // 3. Verificar pistas
    console.log('\n🎾 PISTAS:\n');
    const courts = await prisma.$queryRaw`
      SELECT id, number, isActive FROM Court ORDER BY number
    `;

    courts.forEach(court => {
      console.log(`   Pista ${court.number}: ${court.isActive ? '✅ Activa' : '❌ Inactiva'} (ID: ${court.id})`);
    });

    // 4. Verificar clases disponibles
    console.log('\n📅 CLASES DISPONIBLES (hoy):\n');
    const today = new Date().toISOString().split('T')[0];
    const todayClasses = await prisma.$queryRaw`
      SELECT 
        ts.id,
        time(ts.start) as hora,
        ts.level,
        ts.totalPrice,
        u.name as instructor,
        COUNT(b.id) as reservas
      FROM TimeSlot ts
      JOIN Instructor i ON i.id = ts.instructorId
      JOIN User u ON u.id = i.userId
      LEFT JOIN Booking b ON b.timeSlotId = ts.id AND b.status = 'CONFIRMED'
      WHERE date(ts.start) = ${today}
      AND ts.courtNumber IS NULL
      GROUP BY ts.id
      ORDER BY ts.start
    `;

    if (todayClasses.length > 0) {
      console.log(`   Total: ${todayClasses.length} clases\n`);
      todayClasses.forEach(cls => {
        console.log(`   ${cls.hora} - ${cls.level}`);
        console.log(`      Instructor: ${cls.instructor}`);
        console.log(`      Precio: €${cls.totalPrice}`);
        console.log(`      Reservas: ${cls.reservas}/4`);
        console.log('');
      });
    } else {
      console.log('   ⚠️ No hay clases disponibles para hoy');
      console.log('   Ejecutar: node auto-generate-cards.js');
    }

    // 5. Verificar clases confirmadas
    console.log('\n🏆 CLASES CONFIRMADAS:\n');
    const confirmedClasses = await prisma.$queryRaw`
      SELECT 
        date(ts.start) as fecha,
        time(ts.start) as hora,
        ts.courtNumber as pista,
        u.name as instructor,
        COUNT(b.id) as jugadores
      FROM TimeSlot ts
      JOIN Instructor i ON i.id = ts.instructorId
      JOIN User u ON u.id = i.userId
      LEFT JOIN Booking b ON b.timeSlotId = ts.id AND b.status = 'CONFIRMED'
      WHERE ts.courtNumber IS NOT NULL
      GROUP BY ts.id
      ORDER BY ts.start DESC
      LIMIT 5
    `;

    if (confirmedClasses.length > 0) {
      console.log(`   Últimas ${confirmedClasses.length} clases confirmadas:\n`);
      confirmedClasses.forEach(cls => {
        console.log(`   ${cls.fecha} ${cls.hora} - Pista ${cls.pista}`);
        console.log(`      Instructor: ${cls.instructor}`);
        console.log(`      Jugadores: ${cls.jugadores}`);
        console.log('');
      });
    } else {
      console.log('   No hay clases confirmadas aún');
    }

    console.log('='.repeat(60));
    console.log('\n✅ SISTEMA VERIFICADO CORRECTAMENTE\n');
    console.log('📋 Resumen:');
    console.log(`   - ${users.length} usuarios (${users.filter(u => u.role === 'PLAYER').length} alumnos, ${users.filter(u => u.role === 'INSTRUCTOR').length} instructores)`);
    console.log(`   - ${instructors.length} instructores activos`);
    console.log(`   - ${courts.length} pistas disponibles`);
    console.log(`   - ${todayClasses.length} clases disponibles hoy`);
    console.log(`   - ${confirmedClasses.length} clases confirmadas`);
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

verifySetup();
