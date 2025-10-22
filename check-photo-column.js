const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPhotoColumn() {
  console.log('\n🔍 VERIFICANDO COLUMNAS DE FOTOS\n');
  console.log('='.repeat(60));

  try {
    // 1. Verificar estructura de tabla User
    console.log('\n📊 Estructura de tabla User:');
    const userColumns = await prisma.$queryRaw`
      PRAGMA table_info(User)
    `;
    
    console.log('\nColumnas:');
    userColumns.forEach(col => {
      if (col.name.toLowerCase().includes('photo') || col.name.toLowerCase().includes('picture')) {
        console.log(`   ✅ ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : 'NULLABLE'}`);
      }
    });
    
    const hasUserPhoto = userColumns.some(col => 
      col.name === 'profilePictureUrl' || col.name === 'profilePhoto'
    );
    
    if (!hasUserPhoto) {
      console.log('   ❌ No se encontró columna de foto en User');
    }

    // 2. Verificar estructura de tabla Instructor
    console.log('\n📊 Estructura de tabla Instructor:');
    const instructorColumns = await prisma.$queryRaw`
      PRAGMA table_info(Instructor)
    `;
    
    console.log('\nColumnas:');
    instructorColumns.forEach(col => {
      if (col.name.toLowerCase().includes('photo') || col.name.toLowerCase().includes('picture')) {
        console.log(`   ✅ ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : 'NULLABLE'}`);
      }
    });
    
    const hasInstructorPhoto = instructorColumns.some(col => 
      col.name === 'profilePictureUrl' || col.name === 'profilePhoto'
    );
    
    if (!hasInstructorPhoto) {
      console.log('   ❌ No se encontró columna de foto en Instructor');
    }

    // 3. Probar si podemos leer la columna
    console.log('\n🧪 Probando lectura de datos:');
    
    const users = await prisma.$queryRaw`
      SELECT id, name, profilePictureUrl FROM User LIMIT 3
    `;
    
    console.log('\nUsuarios con foto:');
    users.forEach(user => {
      console.log(`   - ${user.name}: ${user.profilePictureUrl || '(sin foto)'}`);
    });

    // 4. Verificar instructores
    const instructors = await prisma.$queryRaw`
      SELECT i.id, u.name, u.profilePictureUrl 
      FROM Instructor i
      LEFT JOIN User u ON i.userId = u.id
      LIMIT 3
    `;
    
    console.log('\nInstructores con foto:');
    instructors.forEach(inst => {
      console.log(`   - ${inst.name}: ${inst.profilePictureUrl || '(sin foto)'}`);
    });

    // 5. Intentar actualizar un instructor
    console.log('\n🧪 Probando actualización de foto...');
    
    const testUrl = '/uploads/profiles/test_image.jpg';
    const testInstructor = instructors[0];
    
    if (testInstructor && testInstructor.id) {
      console.log(`\n   Actualizando instructor: ${testInstructor.name}`);
      console.log(`   ID Usuario: ${testInstructor.id}`);
      
      // Obtener userId del instructor
      const instructorData = await prisma.$queryRaw`
        SELECT userId FROM Instructor WHERE id = ${testInstructor.id}
      `;
      
      if (instructorData.length > 0) {
        const userId = instructorData[0].userId;
        console.log(`   UserId encontrado: ${userId}`);
        
        // Intentar actualizar
        await prisma.$executeRaw`
          UPDATE User 
          SET profilePictureUrl = ${testUrl}
          WHERE id = ${userId}
        `;
        
        console.log('   ✅ Actualización exitosa');
        
        // Verificar
        const updated = await prisma.$queryRaw`
          SELECT profilePictureUrl FROM User WHERE id = ${userId}
        `;
        
        console.log(`   📸 Foto guardada: ${updated[0]?.profilePictureUrl}`);
        
        // Revertir cambio
        await prisma.$executeRaw`
          UPDATE User 
          SET profilePictureUrl = NULL
          WHERE id = ${userId}
        `;
        
        console.log('   🔄 Cambio revertido (prueba completada)');
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ DIAGNÓSTICO COMPLETO\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPhotoColumn();
