const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const instructors = await prisma.instructor.findMany({
    select: {
      id: true,
      name: true,
      user: {
        select: {
          name: true
        }
      }
    }
  });

  console.log('📋 Instructores en la base de datos:\n');
  instructors.forEach((inst, idx) => {
    console.log(`${idx + 1}. Instructor.name: "${inst.name || 'NULL'}"`);
    console.log(`   User.name:       "${inst.user?.name || 'NULL'}"\n`);
  });

  await prisma.$disconnect();
})();
