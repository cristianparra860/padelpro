// Script para asignar género (masculino/femenino) a todos los usuarios
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function assignGenderToAllUsers() {
  console.log('🔍 Asignando género a todos los usuarios...\n');
  
  try {
    // Obtener todos los usuarios
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        gender: true
      }
    });
    
    console.log(`📊 Total usuarios encontrados: ${users.length}\n`);
    
    let updated = 0;
    let alreadySet = 0;
    
    for (const user of users) {
      // Si ya tiene género definido y es válido, saltarlo
      if (user.gender === 'masculino' || user.gender === 'femenino') {
        console.log(`✅ ${user.name} - Ya tiene género: ${user.gender}`);
        alreadySet++;
        continue;
      }
      
      // Determinar género basado en el nombre (heurística simple)
      // Puedes personalizar esta lógica según tus necesidades
      let assignedGender = 'masculino'; // Default
      
      const nameLower = (user.name || '').toLowerCase();
      
      // Nombres femeninos comunes
      const femaleNames = ['ana', 'maria', 'laura', 'elena', 'sofia', 'carmen', 'isabel', 
                          'patricia', 'paula', 'marta', 'sara', 'lucia', 'andrea', 
                          'cristina', 'raquel', 'beatriz', 'silvia', 'monica', 'julia',
                          'natalia', 'claudia', 'alicia', 'rosa', 'pilar', 'mercedes',
                          'victoria', 'gabriela', 'daniela', 'valeria', 'martina'];
      
      // Nombres masculinos comunes
      const maleNames = ['juan', 'carlos', 'jose', 'antonio', 'manuel', 'francisco', 
                        'javier', 'david', 'miguel', 'pedro', 'jesus', 'alejandro',
                        'fernando', 'sergio', 'pablo', 'rafael', 'daniel', 'jorge',
                        'luis', 'alberto', 'mario', 'raul', 'enrique', 'adrian',
                        'roberto', 'angel', 'ivan', 'oscar', 'victor', 'marc'];
      
      // Detectar género por nombre
      const firstName = nameLower.split(' ')[0];
      
      if (femaleNames.some(name => firstName.includes(name))) {
        assignedGender = 'femenino';
      } else if (maleNames.some(name => firstName.includes(name))) {
        assignedGender = 'masculino';
      } else {
        // Si no podemos determinar, asignar basado en patrón aleatorio
        // Puedes cambiar esto para asignar manualmente
        assignedGender = Math.random() > 0.5 ? 'masculino' : 'femenino';
      }
      
      // Actualizar usuario
      await prisma.user.update({
        where: { id: user.id },
        data: { gender: assignedGender }
      });
      
      console.log(`🔄 ${user.name} - Asignado: ${assignedGender}`);
      updated++;
    }
    
    console.log('\n📊 RESUMEN:');
    console.log(`   ✅ Actualizados: ${updated}`);
    console.log(`   ⏭️  Ya tenían género: ${alreadySet}`);
    console.log(`   📝 Total: ${users.length}`);
    
    // Verificar resultados
    console.log('\n🔍 Verificando distribución de género:');
    const genderStats = await prisma.$queryRaw`
      SELECT gender, COUNT(*) as count 
      FROM User 
      GROUP BY gender
    `;
    
    console.table(genderStats);
    
    // Verificar que no haya ningún usuario sin género o con género inválido
    const invalidGender = await prisma.$queryRaw`
      SELECT id, name, gender 
      FROM User 
      WHERE gender IS NULL OR gender NOT IN ('masculino', 'femenino')
    `;
    
    if (invalidGender.length > 0) {
      console.log('\n⚠️  USUARIOS CON GÉNERO INVÁLIDO:');
      console.table(invalidGender);
    } else {
      console.log('\n✅ Todos los usuarios tienen género válido (masculino/femenino)');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

assignGenderToAllUsers();
