const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findCristianSlots() {
  console.log('🔍 Buscando slots de Cristian Parra con creditsSlots\n');
  
  // Buscar instructor
  const instructor = await prisma.instructor.findFirst({
    where: { name: { contains: 'Cristian Parra' } }
  });
  
  if (!instructor) {
    console.log('❌ Instructor no encontrado');
    await prisma.$disconnect();
    return;
  }
  
  console.log(`✅ Instructor: ${instructor.name} (${instructor.id})\n`);
  
  // Buscar slots con creditsSlots
  const slots = await prisma.timeSlot.findMany({
    where: {
      instructorId: instructor.id,
      creditsSlots: { not: null }
    },
    orderBy: { start: 'asc' },
    take: 20
  });
  
  console.log(`📊 Slots con creditsSlots: ${slots.length}\n`);
  
  slots.forEach((slot, i) => {
    const date = new Date(slot.start).toLocaleString('es-ES', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    let creditsSlots = [];
    try {
      creditsSlots = typeof slot.creditsSlots === 'string' 
        ? JSON.parse(slot.creditsSlots)
        : (Array.isArray(slot.creditsSlots) ? slot.creditsSlots : []);
    } catch (e) {}
    
    const hasActiveCredits = creditsSlots.length > 0;
    
    console.log(`${i + 1}. ${date}`);
    console.log(`   ID: ${slot.id}`);
    console.log(`   creditsSlots: [${creditsSlots.join(', ')}] ${hasActiveCredits ? '🎁' : '⚪'}`);
    console.log(`   courtId: ${slot.courtId || 'NULL (disponible)'}`);
    console.log('');
  });
  
  // Buscar slots de HOY
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const todaySlots = await prisma.timeSlot.findMany({
    where: {
      instructorId: instructor.id,
      start: { gte: today, lt: tomorrow },
      courtId: null
    },
    orderBy: { start: 'asc' }
  });
  
  console.log(`\n📅 Slots de HOY (${today.toLocaleDateString('es-ES')}): ${todaySlots.length}`);
  
  if (todaySlots.length > 0) {
    console.log('\nConfigurar uno con creditsSlots? (solo lectura, no modifico)\n');
    todaySlots.slice(0, 3).forEach((s, i) => {
      const time = new Date(s.start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      console.log(`${i + 1}. ${time} - ID: ${s.id}`);
    });
  }
  
  await prisma.$disconnect();
}

findCristianSlots().catch(console.error);
