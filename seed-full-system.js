const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fullSeed() {
  console.log('\n🌱 SEED COMPLETO: Club, Usuarios, Instructores, Pistas y Horarios\n');

  try {
    // 1. CLUB
    console.log('🏢 Creando club...');
    const club = await prisma.$queryRaw`
      INSERT OR IGNORE INTO Club (id, name, address, createdAt, updatedAt)
      VALUES ('club-1', 'Club Padel', 'Calle Principal 123', datetime('now'), datetime('now'))
    `;
    console.log('✅ Club creado');

    // 2. USUARIO
    console.log('\n👤 Creando usuario Alex...');
    await prisma.$executeRaw`
      INSERT OR IGNORE INTO User (
        id, email, name, clubId, level, position, credits, 
        genderCategory, preferredGameType, createdAt, updatedAt
      )
      VALUES (
        'alex-user-id',
        'alex@example.com',
        'Alex García',
        'club-1',
        'intermedio',
        'derecha',
        10000,
        'masculino',
        'clases',
        datetime('now'),
        datetime('now')
      )
    `;
    console.log('✅ Usuario Alex creado');

    // 3. INSTRUCTOR
    console.log('\n👨‍🏫 Creando instructor...');
    await prisma.$executeRaw`
      INSERT OR IGNORE INTO Instructor (
        id, userId, clubId, hourlyRate, isActive, createdAt, updatedAt
      )
      VALUES (
        'instructor-1',
        'alex-user-id',
        'club-1',
        25.0,
        1,
        datetime('now'),
        datetime('now')
      )
    `;
    console.log('✅ Instructor creado');

    // 4. PISTAS
    console.log('\n🎾 Creando 4 pistas...');
    for (let i = 1; i <= 4; i++) {
      await prisma.$executeRaw`
        INSERT OR IGNORE INTO Court (
          id, number, clubId, isActive, createdAt, updatedAt
        )
        VALUES (
          'court-${i}',
          ${i},
          'club-1',
          1,
          datetime('now'),
          datetime('now')
        )
      `;
      console.log(`   ✅ Pista ${i} creada`);
    }

    // 5. HORARIO DEL CLUB (Lunes a Domingo)
    console.log('\n📅 Creando horario del club (08:00-22:00)...');
    for (let day = 1; day <= 7; day++) {
      await prisma.$executeRaw`
        INSERT OR IGNORE INTO ClubSchedule (
          id, clubId, dayOfWeek, openTime, closeTime, isActive, createdAt, updatedAt
        )
        VALUES (
          'club-schedule-day${day}',
          'club-1',
          ${day},
          '08:00',
          '22:00',
          1,
          datetime('now'),
          datetime('now')
        )
      `;
      console.log(`   ✅ Día ${day}: 08:00-22:00`);
    }

    // 6. DISPONIBILIDAD DEL INSTRUCTOR (Lunes a Domingo, 09:00-18:00)
    console.log('\n👨‍🏫 Creando disponibilidad del instructor...');
    for (let day = 1; day <= 7; day++) {
      // Mañana: 09:00-13:00
      await prisma.$executeRaw`
        INSERT OR IGNORE INTO InstructorAvailability (
          id, instructorId, dayOfWeek, startTime, endTime, isActive, createdAt, updatedAt
        )
        VALUES (
          'inst-avail-day${day}-morning',
          'instructor-1',
          ${day},
          '09:00',
          '13:00',
          1,
          datetime('now'),
          datetime('now')
        )
      `;

      // Tarde: 15:00-18:00
      await prisma.$executeRaw`
        INSERT OR IGNORE INTO InstructorAvailability (
          id, instructorId, dayOfWeek, startTime, endTime, isActive, createdAt, updatedAt
        )
        VALUES (
          'inst-avail-day${day}-afternoon',
          'instructor-1',
          ${day},
          '15:00',
          '18:00',
          1,
          datetime('now'),
          datetime('now')
        )
      `;
      
      console.log(`   ✅ Día ${day}: 09:00-13:00, 15:00-18:00`);
    }

    console.log('\n✅ SEED COMPLETO FINALIZADO');
    console.log('\n📊 RESUMEN:');
    console.log('   - 1 Club');
    console.log('   - 1 Usuario (Alex)');
    console.log('   - 1 Instructor (Carlos)');
    console.log('   - 4 Pistas');
    console.log('   - 7 días de horario del club');
    console.log('   - 14 franjas de disponibilidad del instructor');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

fullSeed();
