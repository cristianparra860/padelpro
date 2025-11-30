const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

prisma.instructor.findFirst({
  where: { user: { name: { contains: 'Cristian' } } },
  select: { id: true, levelRanges: true, user: { select: { name: true } } }
}).then(inst => {
  console.log(JSON.stringify(inst, null, 2));
  prisma.$disconnect();
});
