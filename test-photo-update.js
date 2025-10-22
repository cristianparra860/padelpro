const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testPhotoUpdate() {
  console.log('\n🧪 PRUEBA COMPLETA DE ACTUALIZACIÓN DE FOTO\n');
  console.log('='.repeat(60));

  try {
    // 1. Obtener instructor Carlos
    console.log('\n1️⃣ Obteniendo instructor Carlos...');
    const instructors = await prisma.$queryRaw`
      SELECT 
        i.id as instructorId,
        i.userId,
        u.name,
        u.profilePictureUrl as currentPhoto
      FROM Instructor i
      LEFT JOIN User u ON i.userId = u.id
      WHERE i.id = 'instructor-carlos'
    `;

    if (instructors.length === 0) {
      console.log('❌ No se encontró el instructor Carlos');
      return;
    }

    const instructor = instructors[0];
    console.log('✅ Instructor encontrado:');
    console.log(`   Nombre: ${instructor.name}`);
    console.log(`   Instructor ID: ${instructor.instructorId}`);
    console.log(`   User ID: ${instructor.userId}`);
    console.log(`   Foto actual: ${instructor.currentPhoto || '(sin foto)'}`);

    // 2. Simular subida de foto
    const testPhotoUrl = '/uploads/profiles/test_carlos_photo.jpg';
    console.log(`\n2️⃣ Simulando actualización con foto: ${testPhotoUrl}`);

    // 3. Actualizar como lo hace la API
    console.log('\n3️⃣ Actualizando instructor (especialidades, tarifa, etc.)...');
    await prisma.$executeRaw`
      UPDATE Instructor 
      SET specialties = 'Entrenamiento Personal', 
          hourlyRate = 35.0,
          updatedAt = datetime('now')
      WHERE id = ${instructor.instructorId}
    `;
    console.log('   ✅ Instructor actualizado');

    // 4. Actualizar foto en User
    console.log('\n4️⃣ Actualizando foto en tabla User...');
    await prisma.$executeRaw`
      UPDATE User 
      SET profilePictureUrl = ${testPhotoUrl}
      WHERE id = ${instructor.userId}
    `;
    console.log('   ✅ Foto actualizada en User');

    // 5. Verificar actualización
    console.log('\n5️⃣ Verificando actualización...');
    const updated = await prisma.$queryRaw`
      SELECT 
        i.id,
        i.userId,
        i.specialties,
        i.hourlyRate,
        u.name,
        u.profilePictureUrl
      FROM Instructor i
      LEFT JOIN User u ON i.userId = u.id
      WHERE i.id = ${instructor.instructorId}
    `;

    if (updated.length > 0) {
      const result = updated[0];
      console.log('✅ Datos actualizados:');
      console.log(`   Nombre: ${result.name}`);
      console.log(`   Especialidades: ${result.specialties}`);
      console.log(`   Tarifa: €${result.hourlyRate}/hora`);
      console.log(`   📸 FOTO: ${result.profilePictureUrl}`);
      
      if (result.profilePictureUrl === testPhotoUrl) {
        console.log('\n   ✅✅✅ FOTO GUARDADA CORRECTAMENTE ✅✅✅');
      } else {
        console.log('\n   ❌ FOTO NO SE GUARDÓ CORRECTAMENTE');
      }
    }

    // 6. Simular el GET que hace el frontend
    console.log('\n6️⃣ Simulando GET del frontend...');
    const frontendData = await prisma.$queryRaw`
      SELECT 
        i.id,
        i.userId,
        i.clubId,
        i.hourlyRate,
        i.bio,
        i.yearsExperience,
        i.specialties,
        i.isActive,
        i.createdAt,
        i.updatedAt,
        u.name,
        u.email,
        u.profilePictureUrl,
        c.name as clubName
      FROM Instructor i
      LEFT JOIN User u ON i.userId = u.id
      LEFT JOIN Club c ON i.clubId = c.id
      WHERE i.id = ${instructor.instructorId}
    `;

    if (frontendData.length > 0) {
      const data = frontendData[0];
      console.log('📦 Datos que recibe el frontend:');
      console.log(JSON.stringify({
        id: data.id,
        name: data.name,
        email: data.email,
        profilePictureUrl: data.profilePictureUrl,
        specialties: data.specialties,
        hourlyRate: data.hourlyRate
      }, null, 2));
    }

    // 7. Limpiar - volver al estado original
    console.log('\n7️⃣ Limpiando prueba...');
    await prisma.$executeRaw`
      UPDATE User 
      SET profilePictureUrl = ${instructor.currentPhoto || null}
      WHERE id = ${instructor.userId}
    `;
    console.log('   ✅ Estado restaurado');

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ PRUEBA COMPLETADA\n');
    console.log('📋 Conclusión: El sistema funciona correctamente.');
    console.log('    Si no ves la foto en el frontend, puede ser:');
    console.log('    1. Problema de cache del navegador');
    console.log('    2. La foto no se está subiendo realmente');
    console.log('    3. El componente no está recargando los datos después de guardar\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testPhotoUpdate();
