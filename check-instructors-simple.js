const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkInstructors() {
  const instructors = await prisma.instructor.findMany({
    where: { isActive: true },
    include: { user: true }
  });
  console.log('Instructors:', instructors.length);
  instructors.forEach(i => {
    console.log(`  - ${i.id}: ${i.user.name}`);
  });
  await prisma.$disconnect();
}

checkInstructors();
