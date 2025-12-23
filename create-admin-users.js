const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function createAdminUsers() {
  try {
    console.log('🔐 Creando usuarios administradores...\n');

    // Buscar el club Padel Estrella Madrid
    const club = await prisma.club.findUnique({
      where: { id: 'padel-estrella-madrid' }
    });

    if (!club) {
      console.log('❌ Club Padel Estrella Madrid no encontrado');
      return;
    }

    const hashedPassword = await bcrypt.hash('Pass123!', 10);

    // 1. Crear Super Admin
    const superAdminEmail = 'superadmin@padelapp.com';
    let superAdmin = await prisma.user.findUnique({
      where: { email: superAdminEmail }
    });

    if (!superAdmin) {
      superAdmin = await prisma.user.create({
        data: {
          email: superAdminEmail,
          password: hashedPassword,
          name: 'Super Administrador',
          role: 'SUPER_ADMIN',
          level: 'avanzado',
          credits: 999,
          clubId: club.id
        }
      });
      console.log('✅ Super Admin creado:');
      console.log(`   Email: ${superAdmin.email}`);
      console.log(`   Contraseña: Pass123!`);
      console.log(`   Rol: ${superAdmin.role}\n`);
    } else {
      console.log('ℹ️  Super Admin ya existe\n');
    }

    // 2. Crear Club Admin para Padel Estrella Madrid
    const clubAdminEmail = 'club.admin@padelpro.com';
    let clubAdmin = await prisma.user.findUnique({
      where: { email: clubAdminEmail }
    });

    if (!clubAdmin) {
      clubAdmin = await prisma.user.create({
        data: {
          email: clubAdminEmail,
          password: hashedPassword,
          name: 'Admin Padel Estrella',
          role: 'CLUB_ADMIN',
          level: 'avanzado',
          credits: 100,
          clubId: club.id
        }
      });

      // Crear el registro Admin asociado
      await prisma.admin.create({
        data: {
          userId: clubAdmin.id,
          clubId: club.id,
          role: 'CLUB_ADMIN'
        }
      });

      console.log('✅ Club Admin creado:');
      console.log(`   Email: ${clubAdmin.email}`);
      console.log(`   Contraseña: Pass123!`);
      console.log(`   Rol: ${clubAdmin.role}`);
      console.log(`   Club: ${club.name}\n`);
    } else {
      console.log('ℹ️  Club Admin ya existe\n');
    }

    console.log('✅ Usuarios administradores configurados correctamente!');
    console.log('\n📝 Credenciales:');
    console.log('   Super Admin: superadmin@padelapp.com / Pass123!');
    console.log('   Club Admin:  club.admin@padelpro.com / Pass123!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUsers();
