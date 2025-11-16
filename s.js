const pc = require('@prisma/client');
const p = new pc.PrismaClient();
async function s() {
  const alex = await p.user.findUnique({where: {email: 'alex@example.com'}});
  console.log('Usuario Alex Garcia en DB:');
  console.log('- ID:', alex.id);
  console.log('- Email:', alex.email);
  console.log('- Nombre:', alex.name);
  console.log('- Credits (centimos):', alex.credits);
  console.log('- Credits (euros):', (alex.credits/100).toFixed(2));
  console.log('- BlockedCredits:', alex.blockedCredits);
  console.log('- Points:', alex.points);
  await p.$disconnect();
}
s();
