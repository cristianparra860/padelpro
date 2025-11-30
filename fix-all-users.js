const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function fixCristianAndCheckAll() {
  try {
    console.log('🔧 1. Actualizando rol de Cristian Parra a INSTRUCTOR...\n');
    
    // Actualizar rol de Cristian
    const cristian = await prisma.user.update({
      where: { email: 'cristian.parra@padelpro.com' },
      data: { role: 'INSTRUCTOR' }
    });
    
    console.log('✅ Cristian Parra ahora es INSTRUCTOR');
    console.log('   Email:', cristian.email);
    console.log('   Role:', cristian.role);
    
    // Verificar si tiene registro en tabla Instructor
    let instructor = await prisma.instructor.findUnique({
      where: { userId: cristian.id }
    });
    
    if (!instructor) {
      console.log('📝 Creando registro en tabla Instructor...');
      instructor = await prisma.instructor.create({
        data: {
          id: 'instructor-cristian-parra',
          name: 'Cristian Parra',
          userId: cristian.id,
          assignedClubId: 'padel-estrella-madrid',
          specialties: ['Técnica', 'Táctica']
        }
      });
      console.log('✅ Registro de instructor creado');
    } else {
      console.log('✅ Ya existe registro en tabla Instructor');
    }
    
    console.log('\n🔍 2. Verificando todos los usuarios del sistema...\n');
    
    // Obtener todos los usuarios con contraseña
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        password: true
      }
    });
    
    console.log(`📊 Total usuarios: ${allUsers.length}\n`);
    
    // Verificar cada usuario
    const testPassword = '12345678';
    for (const user of allUsers) {
      const hasPassword = !!user.password;
      let passwordValid = false;
      
      if (hasPassword) {
        try {
          passwordValid = await bcrypt.compare(testPassword, user.password);
        } catch (e) {
          passwordValid = false;
        }
      }
      
      const status = hasPassword ? (passwordValid ? '✅' : '❌') : '⚠️';
      console.log(`${status} ${user.email}`);
      console.log(`   Nombre: ${user.name}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Password: ${hasPassword ? (passwordValid ? 'Válido (12345678)' : 'Hash incorrecto') : 'NO EXISTE'}`);
      console.log('');
    }
    
    console.log('\n🔧 3. Regenerando contraseñas para todos los usuarios...\n');
    
    const newHash = await bcrypt.hash('12345678', 10);
    
    for (const user of allUsers) {
      await prisma.user.update({
        where: { id: user.id },
        data: { password: newHash }
      });
      console.log(`✅ Contraseña actualizada: ${user.email}`);
    }
    
    console.log('\n✅ PROCESO COMPLETADO');
    console.log('\n📋 CREDENCIALES DE CRISTIAN PARRA:');
    console.log('📧 Email: cristian.parra@padelpro.com');
    console.log('🔑 Contraseña: 12345678');
    console.log('👨‍🏫 Role: INSTRUCTOR');
    console.log('🌐 URL: http://localhost:9002/instructor');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixCristianAndCheckAll();
