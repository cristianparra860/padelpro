const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 VERIFICANDO FORMATO DE CRÉDITOS...\n');
  
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      credits: true,
      blockedCredits: true,
      points: true
    },
    take: 5
  });

  if (users.length === 0) {
    console.log('⚠️  NO HAY USUARIOS EN LA BASE DE DATOS');
  } else {
    console.log(`📊 Mostrando ${users.length} usuarios:\n`);
    
    users.forEach(user => {
      console.log(`👤 ${user.name}`);
      console.log(`   Créditos: ${user.credits}`);
      console.log(`   Bloqueados: ${user.blockedCredits}`);
      console.log(`   Disponibles: ${user.credits - user.blockedCredits}`);
      console.log(`   Puntos: ${user.points}`);
      console.log('');
    });
    
    console.log('\n💡 ANÁLISIS:');
    if (users[0].credits > 1000) {
      console.log('   ⚠️  Los créditos parecen estar en CENTAVOS (valores > 1000)');
      console.log('   ⚠️  Necesitas dividir por 100 para mostrar en euros');
    } else {
      console.log('   ✅ Los créditos parecen estar en EUROS (valores < 1000)');
      console.log('   ✅ NO dividir por 100');
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
