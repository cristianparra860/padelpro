const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function quickFix() {
  console.log(' Arreglo rápido...\n');
  
  // Buscar si existe un usuario con ese email
  const existing = await prisma.user.findUnique({
    where: { email: 'alex@example.com' }
  });
  
  if (existing) {
    console.log(` Encontrado usuario: ${existing.name} (${existing.id})`);
    
    // Si no es alex-user-id, crear uno nuevo con otro email
    if (existing.id !== 'alex-user-id') {
      const alexUserExists = await prisma.user.findUnique({
        where: { id: 'alex-user-id' }
      });
      
      if (!alexUserExists) {
        await prisma.user.create({
          data: {
            id: 'alex-user-id',
            name: 'Alex García',
            email: 'alex.reservas@example.com', // Email diferente
            phone: '+34 600 999 999',
            clubId: 'padel-estrella-madrid',
            credits: 100
          }
        });
        console.log(' Usuario alex-user-id creado con email alternativo');
      } else {
        await prisma.user.update({
          where: { id: 'alex-user-id' },
          data: { credits: 100 }
        });
        console.log(' Créditos actualizados para alex-user-id');
      }
    } else {
      // Es el mismo, solo actualizar créditos
      await prisma.user.update({
        where: { id: 'alex-user-id' },
        data: { credits: 100 }
      });
      console.log(' Créditos actualizados a 100');
    }
  }
  
  // Resumen
  console.log('\n Estado del sistema:');
  const instructors = await prisma.instructor.count({ where: { isActive: true } });
  const proposals = await prisma.timeSlot.count({ where: { courtNumber: null } });
  const alex = await prisma.user.findUnique({ where: { id: 'alex-user-id' } });
  
  console.log(`   Instructores: ${instructors}`);
  console.log(`   Propuestas: ${proposals}`);
  console.log(`   Usuario alex-user-id: ${alex ? 'Existe con ' + alex.credits + ' créditos' : 'NO EXISTE'}`);
  
  if (proposals < 2000) {
    console.log('\n Regenerando propuestas...');
    try {
      const response = await fetch('http://localhost:9002/api/cron/generate-cards?days=30');
      const result = await response.json();
      console.log(` ${result.created} propuestas generadas`);
    } catch (e) {
      console.log(' Error:', e.message);
    }
  }
  
  await prisma.$disconnect();
}

quickFix();
