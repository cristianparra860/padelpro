const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedBasicData() {
  console.log('\n🌱 Creando datos básicos para el sistema automático...\n');

  try {
    const clubId = 'club-1';

    // 1. Club
    await prisma.$executeRaw`
      INSERT OR IGNORE INTO Club (id, name, address, createdAt, updatedAt)
      VALUES (${clubId}, 'Club Padel', 'Calle Principal 123', datetime('now'), datetime('now'))
    `;
    console.log('✅ Club');

    // 2. Usuario
    await prisma.$executeRaw`
      INSERT OR IGNORE INTO User (id, email, name, clubId, level, credits, genderCategory, createdAt, updatedAt)
      VALUES ('alex-user-id', 'alex@example.com', 'Alex García', ${clubId}, 'intermedio', 10000, 'masculino', datetime('now'), datetime('now'))
    `;
    console.log('✅ Usuario');

    // 3. Instructor
    await prisma.$executeRaw`
      INSERT OR IGNORE INTO Instructor (id, userId, clubId, hourlyRate, isActive, createdAt, updatedAt)
      VALUES ('instructor-1', 'alex-user-id', ${clubId}, 25.0, 1, datetime('now'), datetime('now'))
    `;
    console.log('✅ Instructor');

    // 4. Pistas (4 pistas)
    for (let i = 1; i <= 4; i++) {
      const courtId = `court-${i}`;
      await prisma.$executeRaw`
        INSERT OR IGNORE INTO Court (id, number, clubId, isActive, createdAt, updatedAt)
        VALUES (${courtId}, ${i}, ${clubId}, 1, datetime('now'), datetime('now'))
      `;
    }
    console.log('✅ 4 Pistas');

    console.log('\n✅ Datos básicos creados exitosamente');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

seedBasicData();
