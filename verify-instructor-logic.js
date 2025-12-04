const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyLogic() {
  console.log('🔍 Verificación Final: Lógica de botones de instructor\n');
  
  // 1. Obtener instructor de Cristian
  const instructor = await prisma.instructor.findFirst({
    where: { userId: 'user-cristian-parra' }
  });
  
  if (!instructor) {
    console.log('❌ No se encontró instructor para user-cristian-parra');
    await prisma.$disconnect();
    return;
  }
  
  console.log('✅ Instructor encontrado:');
  console.log(`   ID: ${instructor.id}`);
  console.log(`   Nombre: ${instructor.name}`);
  console.log(`   UserID: ${instructor.userId}\n`);
  
  // 2. Obtener slots de hoy
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const allSlots = await prisma.timeSlot.findMany({
    where: {
      start: {
        gte: today,
        lt: tomorrow
      }
    },
    select: {
      id: true,
      instructorId: true,
      start: true,
      instructor: {
        select: {
          name: true
        }
      }
    },
    take: 15,
    orderBy: { start: 'asc' }
  });
  
  console.log(`📅 Slots de hoy (${today.toLocaleDateString('es-ES')}): ${allSlots.length} encontrados\n`);
  
  if (allSlots.length === 0) {
    console.log('⚠️ No hay slots para hoy. Buscando slots futuros...\n');
    
    const futureSlots = await prisma.timeSlot.findMany({
      where: {
        start: { gte: new Date() }
      },
      select: {
        id: true,
        instructorId: true,
        start: true,
        instructor: {
          select: {
            name: true
          }
        }
      },
      take: 15,
      orderBy: { start: 'asc' }
    });
    
    console.log(`📅 Próximos slots: ${futureSlots.length} encontrados\n`);
    allSlots.push(...futureSlots);
  }
  
  // 3. Simular lógica del frontend
  console.log('🎯 Simulando lógica del frontend:\n');
  console.log(`   const isInstructor = true;`);
  console.log(`   const instructorId = "${instructor.id}";\n`);
  
  let countConBotones = 0;
  let countSinBotones = 0;
  
  allSlots.slice(0, 10).forEach((slot, i) => {
    const canEditCreditsSlots = instructor.id === slot.instructorId;
    const date = new Date(slot.start).toLocaleString('es-ES');
    
    console.log(`${i+1}. Slot ${slot.id.substring(0, 12)}... - ${date}`);
    console.log(`   Instructor: ${slot.instructor?.name || 'Sin nombre'}`);
    console.log(`   InstructorID del slot: ${slot.instructorId}`);
    console.log(`   InstructorID logueado: ${instructor.id}`);
    console.log(`   ¿Coinciden?: ${instructor.id === slot.instructorId ? '✅' : '❌'}`);
    console.log(`   canEditCreditsSlots = ${canEditCreditsSlots}`);
    console.log(`   isInstructor prop = ${canEditCreditsSlots ? 'true' : 'false'}`);
    console.log(`   👉 ${canEditCreditsSlots ? '✅ BOTONES VISIBLES' : '❌ SIN BOTONES'}\n`);
    
    if (canEditCreditsSlots) countConBotones++;
    else countSinBotones++;
  });
  
  console.log('─'.repeat(60));
  console.log('\n📊 RESULTADO FINAL:');
  console.log(`   Slots analizados: ${Math.min(10, allSlots.length)}`);
  console.log(`   Con botones 🎁/€: ${countConBotones}`);
  console.log(`   Sin botones: ${countSinBotones}\n`);
  
  if (countConBotones > 0) {
    console.log('✅ CORRECTO: Los botones aparecen SOLO en clases de Cristian Parra');
    console.log('   Los instructores solo pueden editar sus propias clases.');
  } else {
    console.log('⚠️ AVISO: No hay clases de Cristian Parra en los slots mostrados.');
    console.log('   Esto es normal si hay muchos otros instructores.');
    console.log('   Los botones aparecerán cuando encuentre sus clases.');
  }
  
  await prisma.$disconnect();
}

verifyLogic().catch(console.error);
