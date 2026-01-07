const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixInstructorNames() {
  console.log('🔧 Corrigiendo nombres de instructores...\n');

  try {
    // 1. Ver instructores actuales
    const instructors = await prisma.instructor.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    console.log('📋 Instructores encontrados:');
    instructors.forEach(instructor => {
      console.log(`   - ID: ${instructor.id}`);
      console.log(`     Nombre actual: "${instructor.name}"`);
      console.log(`     Usuario relacionado: ${instructor.user?.name || 'N/A'}`);
      console.log(`     Email: ${instructor.user?.email || 'N/A'}\n`);
    });

    // 2. Actualizar nombres basándose en el usuario relacionado
    console.log('\n🔄 Actualizando nombres...\n');
    
    for (const instructor of instructors) {
      if (instructor.user?.name && instructor.name !== instructor.user.name) {
        console.log(`✏️ Actualizando "${instructor.name}" → "${instructor.user.name}"`);
        
        await prisma.instructor.update({
          where: { id: instructor.id },
          data: { name: instructor.user.name }
        });
        
        console.log(`   ✅ Actualizado\n`);
      } else {
        console.log(`⏭️ "${instructor.name}" ya está correcto\n`);
      }
    }

    // 3. Verificar resultado
    console.log('\n📊 Resultado final:');
    const updatedInstructors = await prisma.instructor.findMany({
      select: {
        id: true,
        name: true
      }
    });

    updatedInstructors.forEach(instructor => {
      console.log(`   ✅ ${instructor.name} (${instructor.id.substring(0, 8)}...)`);
    });

    console.log('\n✨ ¡Nombres actualizados correctamente!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixInstructorNames();
