import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCourtFields() {
  console.log('🔍 Checking courtId vs courtNumber fields');
  console.log('');
  
  // Contar por courtId
  const nullCourtId = await prisma.timeSlot.count({
    where: { courtId: null }
  });
  
  const notNullCourtId = await prisma.timeSlot.count({
    where: { courtId: { not: null } }
  });
  
  console.log('📊 courtId field:');
  console.log('   NULL:', nullCourtId);
  console.log('   NOT NULL:', notNullCourtId);
  console.log('');
  
  // Contar por courtNumber
  const nullCourtNumber = await prisma.timeSlot.count({
    where: { courtNumber: null }
  });
  
  const notNullCourtNumber = await prisma.timeSlot.count({
    where: { courtNumber: { not: null } }
  });
  
  console.log('📊 courtNumber field:');
  console.log('   NULL:', nullCourtNumber);
  console.log('   NOT NULL:', notNullCourtNumber);
  console.log('');
  
  // Obtener ejemplos de cada combinación
  console.log('📋 Sample records:');
  console.log('');
  
  const samples = await prisma.timeSlot.findMany({
    take: 10,
    select: {
      id: true,
      start: true,
      courtId: true,
      courtNumber: true
    },
    orderBy: { start: 'asc' }
  });
  
  samples.forEach(slot => {
    console.log(`- ${slot.id}`);
    console.log(`  Start: ${slot.start}`);
    console.log(`  courtId: ${slot.courtId}`);
    console.log(`  courtNumber: ${slot.courtNumber}`);
    console.log('');
  });
  
  await prisma.$disconnect();
}

checkCourtFields();
