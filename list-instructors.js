import { prisma } from './src/lib/prisma.ts';

async function listInstructors() {
  const instructors = await prisma.instructor.findMany();
  instructors.forEach(i => {
    console.log(`${i.id} | ${i.name}`);
  });
  await prisma.$disconnect();
}

listInstructors();
