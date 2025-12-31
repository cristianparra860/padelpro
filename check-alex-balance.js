const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const alex = await prisma.user.findUnique({
    where: { id: 'cmjmrxqpq000jtg8c7jmtlhps' },
    select: { 
      name: true,
      credits: true, 
      blockedCredits: true,
      points: true,
      blockedPoints: true 
    }
  });

  console.log('👤 Alex García:');
  console.log(`  - Créditos totales: ${alex.credits} céntimos = ${(alex.credits / 100).toFixed(2)}€`);
  console.log(`  - Créditos bloqueados: ${alex.blockedCredits} céntimos = ${(alex.blockedCredits / 100).toFixed(2)}€`);
  console.log(`  - Créditos disponibles: ${alex.credits - alex.blockedCredits} céntimos = ${((alex.credits - alex.blockedCredits) / 100).toFixed(2)}€`);
  console.log(`  - Puntos totales: ${alex.points}`);
  console.log(`  - Puntos bloqueados: ${alex.blockedPoints}`);
  console.log(`  - Puntos disponibles: ${alex.points - alex.blockedPoints}`);

  await prisma.$disconnect();
}

main();
