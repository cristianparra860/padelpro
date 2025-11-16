const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function quickFix() {
  console.log(' Verificación rápida del estado...\n');
  
  // 1. Contar instructores
  const instructors = await prisma.instructor.count();
  console.log(`Instructores: ${instructors}`);
  
  // 2. Contar propuestas
  const proposals = await prisma.timeSlot.count({
    where: { courtNumber: null }
  });
  console.log(`Propuestas: ${proposals}`);
  
  // 3. Verificar usuario
  const user = await prisma.user.findFirst({
    where: { 
      OR: [
        { id: 'alex-user-id' },
        { email: 'alex@example.com' }
      ]
    }
  });
  
  if (user) {
    console.log(`\nUsuario encontrado: ${user.name} (${user.id})`);
    console.log(`Créditos: ${user.credits || 0}`);
    
    // Actualizar créditos si es necesario
    if (!user.credits || user.credits < 10) {
      await prisma.user.update({
        where: { id: user.id },
        data: { credits: 100 }
      });
      console.log(' Créditos actualizados a 100');
    }
  } else {
    console.log('\n No se encontró usuario para reservas');
  }
  
  await prisma.$disconnect();
  
  console.log('\n Usa este usuario en la consola del navegador (F12):');
  console.log(`
const user = {
  id: '${user?.id || 'alex-user-id'}',
  name: '${user?.name || 'Alex García'}',
  email: '${user?.email || 'alex@example.com'}',
  clubId: 'club-padel-estrella',
  credits: 100,
  credit: 100,
  level: 'intermedio'
};
localStorage.setItem('padelpro_current_user', JSON.stringify(user));
location.reload();
  `);
}

quickFix();
