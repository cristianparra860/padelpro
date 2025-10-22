const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedMinimal() {
  try {
    console.log('🌱 Creando datos mínimos para probar...\n');

    // 1. Crear Admin (con upsert manual)
    console.log('👨‍💼 Creando admin...');
    await prisma.$executeRaw`
      INSERT OR REPLACE INTO Admin (id, email, name, role, isActive, createdAt, updatedAt)
      VALUES ('admin-estrella', 'admin@padelestrella.com', 'Admin Estrella', 'CLUB_ADMIN', 1, datetime('now'), datetime('now'))
    `;

    // 2. Crear Club con totalCourts
    console.log('🏢 Creando club...');
    await prisma.$executeRaw`
      INSERT OR REPLACE INTO Club (id, name, address, email, phone, createdAt, updatedAt)
      VALUES ('club-padel-estrella', 'Padel Estrella Madrid', 'Calle del Pádel 123, Madrid', 'info@padelestrella.com', '+34 912 345 678', datetime('now'), datetime('now'))
    `;

    // Agregar campo totalCourts si no existe
    try {
      await prisma.$executeRaw`ALTER TABLE Club ADD COLUMN totalCourts INTEGER DEFAULT 4`;
      console.log('   ✅ Columna totalCourts agregada');
    } catch (e) {
      console.log('   ℹ️  Columna totalCourts ya existe');
    }

    await prisma.$executeRaw`UPDATE Club SET totalCourts = 4 WHERE id = 'club-padel-estrella'`;

    // 3. Crear Usuario Alex García
    console.log('👤 Creando usuario Alex García...');
    await prisma.$executeRaw`
      INSERT INTO User (id, email, name, phone, level, position, clubId, role, preference, visibility, credits, createdAt, updatedAt, profilePictureUrl)
      VALUES (
        'cmge3nlkv0001tg30p0pw8hdm', 
        'alex.garcia@email.com', 
        'Alex García', 
        '+34 600 123 456', 
        'intermedio', 
        'Derecha', 
        'club-padel-estrella', 
        'PLAYER', 
        'NORMAL', 
        'PUBLIC', 
        1000, 
        datetime('now'), 
        datetime('now'),
        'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex%20Garcia'
      )
    `;

    // 4. Crear Instructores
    console.log('👨‍🏫 Creando instructores...');
    
    const instructors = [
      { id: 'instructor-elena', userId: 'user-elena-inst', name: 'Elena Martínez', email: 'elena@email.com' },
      { id: 'instructor-carlos', userId: 'user-carlos-inst', name: 'Carlos Martínez', email: 'carlos@email.com' },
      { id: 'instructor-lucia', userId: 'user-lucia-inst', name: 'Lucía García', email: 'lucia@email.com' },
      { id: 'instructor-miguel', userId: 'user-miguel-inst', name: 'Miguel Rodríguez', email: 'miguel@email.com' },
    ];

    for (const inst of instructors) {
      // Crear usuario del instructor
      await prisma.$executeRaw`
        INSERT INTO User (id, email, name, clubId, role, level, preference, visibility, credits, createdAt, updatedAt, profilePictureUrl)
        VALUES (
          ${inst.userId}, 
          ${inst.email}, 
          ${inst.name}, 
          'club-padel-estrella', 
          'INSTRUCTOR', 
          'avanzado', 
          'NORMAL', 
          'PUBLIC', 
          0, 
          datetime('now'), 
          datetime('now'),
          ${'https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(inst.name)}
        )
      `;

      // Crear perfil de instructor
      await prisma.$executeRaw`
        INSERT INTO Instructor (id, userId, clubId, hourlyRate, isActive, createdAt, updatedAt)
        VALUES (
          ${inst.id}, 
          ${inst.userId}, 
          'club-padel-estrella', 
          35.0, 
          1, 
          datetime('now'), 
          datetime('now')
        )
      `;
    }

    // 5. Crear TimeSlots para los próximos 3 días
    console.log('📅 Creando clases...');
    
    const today = new Date();
    const hours = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];
    
    for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
      const date = new Date(today);
      date.setDate(date.getDate() + dayOffset);
      const dateStr = date.toISOString().split('T')[0];
      
      for (const hour of hours) {
        for (const inst of instructors) {
          const startDateTime = `${dateStr}T${hour}:00.000Z`;
          const endTime = parseInt(hour.split(':')[0]) + 1;
          const endDateTime = `${dateStr}T${endTime.toString().padStart(2, '0')}:00:00.000Z`;
          
          const slotId = `ts_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          await prisma.$executeRaw`
            INSERT INTO TimeSlot (
              id, clubId, instructorId, start, end, 
              maxPlayers, totalPrice, level, category, createdAt, updatedAt
            )
            VALUES (
              ${slotId}, 
              'club-padel-estrella', 
              ${inst.id}, 
              ${startDateTime}, 
              ${endDateTime}, 
              4, 
              55.0, 
              'ABIERTO', 
              'ABIERTO', 
              datetime('now'), 
              datetime('now')
            )
          `;
        }
      }
    }

    console.log('\n✅ Datos mínimos creados exitosamente!');
    console.log('   - 1 Admin');
    console.log('   - 1 Club (Padel Estrella Madrid)');
    console.log('   - 1 Usuario (Alex García) con €1000 de saldo');
    console.log(`   - 4 Instructores`);
    console.log(`   - ${hours.length * 4 * 3} TimeSlots (3 días x ${hours.length} horas x 4 instructores)`);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedMinimal();
