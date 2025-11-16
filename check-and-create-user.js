const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUsers() {
  console.log(' Verificando usuarios en la base de datos...\n');
  
  const users = await prisma.user.findMany();
  
  console.log(`Total usuarios: ${users.length}\n`);
  
  users.forEach(u => {
    console.log(`- ID: ${u.id}`);
    console.log(`  Nombre: ${u.name}`);
    console.log(`  Email: ${u.email}`);
    console.log(`  Club: ${u.clubId}`);
    console.log('');
  });
  
  // Verificar si existe alex-user-id
  const alexUser = await prisma.user.findUnique({
    where: { id: 'alex-user-id' }
  });
  
  if (!alexUser) {
    console.log(' Usuario "alex-user-id" NO EXISTE');
    console.log('\n Creando usuario alex-user-id...\n');
    
    const newUser = await prisma.user.create({
      data: {
        id: 'alex-user-id',
        name: 'Alex García',
        email: 'alex@example.com',
        phone: '+34 600 123 456',
        clubId: 'club-padel-estrella'
      }
    });
    
    console.log(' Usuario creado:', newUser.name);
  } else {
    console.log(' Usuario "alex-user-id" existe');
  }
  
  await prisma.$disconnect();
}

checkUsers();
