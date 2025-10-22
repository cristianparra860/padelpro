const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser() {
  const user = await prisma.user.findUnique({
    where: { id: 'alex-user-id' }
  });

  console.log('\n👤 Usuario Alex García:');
  console.log('   ID:', user.id);
  console.log('   Nombre:', user.name);
  console.log('   Nivel:', user.level);
  console.log('   Categoría género:', user.genderCategory || 'NO DEFINIDA');
  console.log('   Tipo de juego preferido:', user.preferredGameType || 'NO DEFINIDA');
  console.log('   Créditos:', user.credits);

  await prisma.$disconnect();
}

checkUser();
