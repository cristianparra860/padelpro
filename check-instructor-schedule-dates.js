const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkInstructorScheduleDates() {
  console.log('📅 Verificando qué fechas tienen InstructorSchedule\n');
  
  const total = await prisma.instructorSchedule.count();
  console.log(`Total InstructorSchedule: ${total}\n`);
  
  if (total === 0) {
    console.log('❌ NO HAY InstructorSchedule en la base de datos');
    console.log('   Esto explica por qué el calendario del admin no muestra nada');
  } else {
    const first5 = await prisma.instructorSchedule.findMany({
      include: { instructor: true },
      orderBy: { date: 'asc' },
      take: 5
    });
    
    console.log('Primeros 5 InstructorSchedule:');
    first5.forEach(s => {
      const dateStr = new Date(s.date).toISOString().split('T')[0];
      const startTime = new Date(s.startTime).toISOString().substring(11,16);
      const endTime = new Date(s.endTime).toISOString().substring(11,16);
      console.log(`   ${dateStr} | ${startTime}-${endTime} | ${s.instructor?.name || 'Sin instructor'} | Ocupado: ${s.isOccupied}`);
    });
  }
  
  await prisma.$disconnect();
}

checkInstructorScheduleDates();
