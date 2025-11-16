const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testBookingAPI() {
  console.log(' Probando API de reservas...\n');
  
  // Verificar que existan datos necesarios
  const instructors = await prisma.instructor.count();
  const proposals = await prisma.timeSlot.count({ where: { courtNumber: null } });
  const users = await prisma.user.count();
  
  console.log(' Estado de la base de datos:');
  console.log(`   Instructores: ${instructors}`);
  console.log(`   Propuestas: ${proposals}`);
  console.log(`   Usuarios: ${users}`);
  console.log('');
  
  // Obtener una propuesta de ejemplo
  const sampleProposal = await prisma.timeSlot.findFirst({
    where: { courtNumber: null },
    include: { instructor: true }
  });
  
  if (sampleProposal) {
    console.log(' Propuesta de ejemplo:');
    console.log(`   ID: ${sampleProposal.id}`);
    console.log(`   Instructor: ${sampleProposal.instructor?.name}`);
    console.log(`   Fecha: ${new Date(sampleProposal.start).toLocaleString('es-ES')}`);
    console.log(`   Precio: €${sampleProposal.totalPrice}`);
    console.log(`   Max jugadores: ${sampleProposal.maxPlayers}`);
  }
  
  // Verificar usuario alex
  const alexUser = await prisma.user.findUnique({
    where: { id: 'alex-user-id' }
  });
  
  if (alexUser) {
    console.log('\n Usuario Alex García:');
    console.log(`   ID: ${alexUser.id}`);
    console.log(`   Créditos: ${alexUser.credits}`);
    console.log(`   Email: ${alexUser.email}`);
  } else {
    console.log('\n Usuario alex-user-id NO encontrado');
  }
  
  await prisma.$disconnect();
}

testBookingAPI();
