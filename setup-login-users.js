const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setupLoginUsers() {
  try {
    console.log('\n🔧 CONFIGURANDO USUARIOS PARA LOGIN\n');

    const standardPassword = await bcrypt.hash('Pass123!', 10);

    // 1. Actualizar admin@padelpro.com a SUPER_ADMIN
    console.log('1. Actualizando Super Admin...');
    await prisma.user.update({
      where: { email: 'admin@padelpro.com' },
      data: {
        role: 'SUPER_ADMIN',
        name: 'Super Admin',
        password: standardPassword
      }
    });
    console.log('✅ Super Admin actualizado: admin@padelpro.com');

    // 2. Crear o actualizar Club Admins
    console.log('\n2. Configurando Club Admins...');
    
    // Buscar o crear club admin para Padel Estrella Madrid
    const clubAdminEmail = 'clubadmin@padelpro.com';
    const existingClubAdmin = await prisma.user.findUnique({
      where: { email: clubAdminEmail }
    });

    if (existingClubAdmin) {
      await prisma.user.update({
        where: { email: clubAdminEmail },
        data: {
          role: 'CLUB_ADMIN',
          name: 'Admin Club Madrid',
          password: standardPassword
        }
      });
      console.log('✅ Club Admin actualizado: clubadmin@padelpro.com');
    } else {
      await prisma.user.create({
        data: {
          email: clubAdminEmail,
          name: 'Admin Club Madrid',
          role: 'CLUB_ADMIN',
          password: standardPassword,
          clubId: 'padel-estrella-madrid',
          level: 'avanzado'
        }
      });
      console.log('✅ Club Admin creado: clubadmin@padelpro.com');
    }

    // 3. Actualizar instructores con contraseña
    console.log('\n3. Actualizando Instructores...');
    const instructorEmails = [
      'instructor@padelpro.com',
      'carlos@padelclub.com',
      'ana@padelclub.com'
    ];

    for (const email of instructorEmails) {
      await prisma.user.update({
        where: { email },
        data: { password: standardPassword }
      });
      console.log(`✅ Instructor actualizado: ${email}`);
    }

    // 4. Actualizar jugadores de ejemplo con contraseña
    console.log('\n4. Actualizando Jugadores...');
    const playerEmails = [
      'alex@example.com',
      'ana.nueva@padelpro.com'
    ];

    for (const email of playerEmails) {
      const user = await prisma.user.findUnique({ where: { email } });
      if (user) {
        await prisma.user.update({
          where: { email },
          data: { password: standardPassword }
        });
        console.log(`✅ Jugador actualizado: ${email}`);
      }
    }

    console.log('\n✨ TODOS LOS USUARIOS CONFIGURADOS');
    console.log('\n📋 CREDENCIALES ESTÁNDAR:');
    console.log('   Contraseña para todos: Pass123!');
    console.log('\n👥 USUARIOS DISPONIBLES:');
    console.log('   🔴 Super Admin: admin@padelpro.com');
    console.log('   🟠 Club Admin: clubadmin@padelpro.com');
    console.log('   🟡 Instructores: instructor@padelpro.com, carlos@padelclub.com, ana@padelclub.com');
    console.log('   🟢 Jugadores: alex@example.com, ana.nueva@padelpro.com');
    console.log();

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupLoginUsers();
