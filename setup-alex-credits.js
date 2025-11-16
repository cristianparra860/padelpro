const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setupAlexGarcia() {
  console.log(' Configurando Alex García con créditos...\n');
  
  // Verificar usuario alex-user-id
  let alexUser = await prisma.user.findUnique({
    where: { id: 'alex-user-id' }
  });
  
  if (alexUser) {
    console.log(' Usuario encontrado:', alexUser.name);
    console.log('   Créditos actuales:', alexUser.credits || 0);
    
    // Actualizar créditos
    alexUser = await prisma.user.update({
      where: { id: 'alex-user-id' },
      data: {
        credits: 100,
        clubId: 'club-padel-estrella'
      }
    });
    
    console.log(' Créditos actualizados:', alexUser.credits);
  }
  
  // Verificar que esté en el club correcto
  const club = await prisma.club.findUnique({
    where: { id: 'club-padel-estrella' },
    include: {
      users: true
    }
  });
  
  if (club) {
    console.log('\n Club:', club.name);
    console.log(' Usuarios en el club:');
    club.users.forEach(u => {
      console.log(`   - ${u.name} (${u.id}) - ${u.credits || 0} créditos`);
    });
  }
  
  await prisma.$disconnect();
}

setupAlexGarcia();
