const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createProperInstructor() {
  console.log('\n👨‍🏫 Creando instructor profesional separado del alumno...\n');

  try {
    const clubId = 'club-1';

    // 1. Crear usuario para el instructor
    console.log('📝 Creando usuario del instructor...');
    await prisma.$executeRaw`
      INSERT OR REPLACE INTO User (
        id, email, name, clubId, level, credits, 
        genderCategory, role, createdAt, updatedAt
      )
      VALUES (
        'instructor-carlos-user',
        'carlos.martinez@padelestrella.com',
        'Carlos Martínez',
        ${clubId},
        'profesional',
        0,
        'masculino',
        'INSTRUCTOR',
        datetime('now'),
        datetime('now')
      )
    `;
    console.log('   ✅ Usuario creado: Carlos Martínez');

    // 2. Crear perfil de instructor
    console.log('\n👨‍🏫 Creando perfil de instructor...');
    await prisma.$executeRaw`
      INSERT OR REPLACE INTO Instructor (
        id, userId, clubId, hourlyRate, isActive, createdAt, updatedAt
      )
      VALUES (
        'instructor-carlos',
        'instructor-carlos-user',
        ${clubId},
        35.0,
        1,
        datetime('now'),
        datetime('now')
      )
    `;
    console.log('   ✅ Instructor creado: Carlos Martínez');
    console.log('      - Tarifa: €35/hora');
    console.log('      - Estado: Activo');

    // 3. Actualizar las clases existentes para usar el nuevo instructor
    console.log('\n🔄 Actualizando clases existentes...');
    const updated = await prisma.$executeRaw`
      UPDATE TimeSlot 
      SET instructorId = 'instructor-carlos', updatedAt = datetime('now')
      WHERE instructorId = 'instructor-1'
    `;
    console.log(`   ✅ ${updated} clases actualizadas con el nuevo instructor`);

    // 4. Verificar el resultado
    console.log('\n📊 Verificando resultado...');
    
    const users = await prisma.$queryRaw`
      SELECT id, name, email, role FROM User WHERE id IN ('alex-user-id', 'instructor-carlos-user')
    `;
    
    console.log('\n👥 Usuarios en el sistema:');
    users.forEach(user => {
      console.log(`   - ${user.name} (${user.email})`);
      console.log(`     Rol: ${user.role}`);
      console.log(`     ID: ${user.id}`);
    });

    const instructors = await prisma.$queryRaw`
      SELECT id, userId, hourlyRate FROM Instructor
    `;
    
    console.log('\n👨‍🏫 Instructores:');
    instructors.forEach(inst => {
      console.log(`   - ID: ${inst.id}`);
      console.log(`     Usuario: ${inst.userId}`);
      console.log(`     Tarifa: €${inst.hourlyRate}/hora`);
    });

    const classes = await prisma.$queryRaw`
      SELECT COUNT(*) as count, instructorId FROM TimeSlot GROUP BY instructorId
    `;
    
    console.log('\n📅 Clases por instructor:');
    classes.forEach(cls => {
      console.log(`   - ${cls.instructorId}: ${cls.count} clases`);
    });

    console.log('\n✅ ¡Instructor profesional creado correctamente!');
    console.log('\n📋 Ahora tienes:');
    console.log('   - Alex García: Alumno (puede reservar clases)');
    console.log('   - Carlos Martínez: Instructor profesional (da las clases)');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

createProperInstructor();
