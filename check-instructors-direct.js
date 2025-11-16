const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkInstructors() {
  console.log('🔍 Verificando instructores...\n');

  // Todos los instructores (incluyendo inactivos)
  const allInstructors = await prisma.instructor.findMany();
  console.log(`📊 Total instructores en DB: ${allInstructors.length}`);
  
  if (allInstructors.length > 0) {
    console.log('\n👥 Instructores encontrados:');
    allInstructors.forEach(i => {
      console.log(`- ID: ${i.id}`);
      console.log(`  Nombre: ${i.name}`);
      console.log(`  Activo: ${i.isActive}`);
      console.log(`  Club: ${i.clubId}`);
      console.log('');
    });
  } else {
    console.log('\n⚠️ NO HAY INSTRUCTORES EN LA BASE DE DATOS');
  }

  // Verificar TimeSlots
  const allSlots = await prisma.timeSlot.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' }
  });
  
  console.log(`\n📊 TimeSlots totales: ${await prisma.timeSlot.count()}`);
  if (allSlots.length > 0) {
    console.log('\nÚltimos 5 TimeSlots:');
    allSlots.forEach(s => {
      console.log(`- ${s.id}: ${s.start} - Instructor: ${s.instructorId} - Court: ${s.courtNumber || 'NULL'}`);
    });
  }

  // Verificar Courts
  const courts = await prisma.court.findMany();
  console.log(`\n📊 Courts totales: ${courts.length}`);

  await prisma.$disconnect();
}

checkInstructors().catch(console.error);
