const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fullRestore() {
  console.log(' Restauración completa del sistema...\n');
  
  // 1. Verificar club
  const club = await prisma.club.findFirst();
  console.log(` Club: ${club?.name} (${club?.id})\n`);
  
  // 2. Verificar y crear instructores faltantes
  console.log(' Verificando instructores...');
  const existingInstructors = await prisma.instructor.findMany();
  console.log(`   Actuales: ${existingInstructors.length}`);
  
  const requiredInstructors = [
    { id: 'instructor-alex-garcia', userId: 'user-alex-garcia', name: 'Alex García', email: 'alex.garcia@padelpro.com' },
    { id: 'instructor-carlos-martinez', userId: 'user-carlos-martinez', name: 'Carlos Martínez', email: 'carlos.martinez@padelpro.com' },
    { id: 'instructor-cristian-parra', userId: 'user-cristian-parra', name: 'Cristian Parra', email: 'cristian.parra@padelpro.com' }
  ];
  
  for (const inst of requiredInstructors) {
    const exists = await prisma.instructor.findUnique({ where: { id: inst.id } });
    if (!exists) {
      // Crear usuario si no existe
      const userExists = await prisma.user.findUnique({ where: { id: inst.userId } });
      if (!userExists) {
        await prisma.user.create({
          data: {
            id: inst.userId,
            name: inst.name,
            email: inst.email,
            phone: `+34 600 111 00${requiredInstructors.indexOf(inst)}`,
            clubId: club.id
          }
        });
      }
      
      // Crear instructor
      await prisma.instructor.create({
        data: {
          id: inst.id,
          userId: inst.userId,
          name: inst.name,
          clubId: club.id,
          isActive: true
        }
      });
      console.log(`    Creado: ${inst.name}`);
    } else {
      console.log(`    Existe: ${inst.name}`);
    }
  }
  
  // 3. Crear usuario alex-user-id para reservas
  console.log('\n Creando usuario de prueba...');
  const alexExists = await prisma.user.findUnique({ where: { id: 'alex-user-id' } });
  if (!alexExists) {
    await prisma.user.create({
      data: {
        id: 'alex-user-id',
        name: 'Alex García',
        email: 'alex@example.com',
        phone: '+34 600 123 456',
        clubId: club.id,
        credits: 100
      }
    });
    console.log('    Usuario alex-user-id creado con 100 créditos');
  } else {
    // Actualizar créditos
    await prisma.user.update({
      where: { id: 'alex-user-id' },
      data: { credits: 100 }
    });
    console.log('    Usuario alex-user-id actualizado con 100 créditos');
  }
  
  // 4. Contar propuestas actuales
  const currentProposals = await prisma.timeSlot.count({ where: { courtNumber: null } });
  console.log(`\n Propuestas actuales: ${currentProposals}`);
  
  if (currentProposals < 2000) {
    console.log('    Pocas propuestas, regenerando...');
    console.log('   (Esto tomará unos segundos)\n');
    
    // Llamar al generador
    try {
      const response = await fetch('http://localhost:9002/api/cron/generate-cards?days=30');
      const result = await response.json();
      console.log(`    Generadas: ${result.created} propuestas`);
    } catch (error) {
      console.log('    Error al generar:', error.message);
    }
  }
  
  // 5. Resumen final
  console.log('\n Estado final:');
  const finalInstructors = await prisma.instructor.count({ where: { isActive: true } });
  const finalProposals = await prisma.timeSlot.count({ where: { courtNumber: null } });
  const finalUsers = await prisma.user.count();
  
  console.log(`   Instructores activos: ${finalInstructors}`);
  console.log(`   Propuestas disponibles: ${finalProposals}`);
  console.log(`   Usuarios totales: ${finalUsers}`);
  
  await prisma.$disconnect();
}

fullRestore();
