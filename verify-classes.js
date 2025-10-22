const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkClasses() {
  try {
    console.log('🔍 Verificando clases creadas...\n');

    const timeSlots = await prisma.$queryRaw`
      SELECT 
        t.id, 
        t.start, 
        t.instructorId, 
        i.name as instructorName,
        t.courtNumber
      FROM TimeSlot t
      LEFT JOIN Instructor i ON t.instructorId = i.id
      ORDER BY t.start
      LIMIT 10
    `;

    console.log(`📅 Primeras 10 clases:\n`);
    
    timeSlots.forEach((slot, index) => {
      console.log(`${index + 1}. ID: ${slot.id}`);
      console.log(`   Hora: ${new Date(slot.start).toLocaleString('es-ES')}`);
      console.log(`   Instructor: ${slot.instructorName || 'N/A'}`);
      console.log(`   Pista: ${slot.courtNumber || 'Sin asignar'}\n`);
    });

    const total = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM TimeSlot
    `;

    console.log(`📊 Total de clases en la BD: ${total[0].count}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkClasses();
