const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

p.user.findMany({ take: 10 }).then(u => {
  console.log('👥 Usuarios:');
  u.forEach(x => console.log(`- ${x.name} (${x.email}) - ID: ${x.id} - ${(Number(x.credits)/100).toFixed(2)}€`));
  p.$disconnect();
});
