const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixBlockedCredits() {
  const userId = 'cmhkwi8so0001tggo0bwojrjy';
  
  console.log('🔧 Recalculando créditos bloqueados...\n');
  
  // 1. Estado ANTES
  const userBefore = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, credits: true, blockedCredits: true }
  });
  
  console.log('ANTES:');
  console.log('  Total: €' + (userBefore.credits/100).toFixed(2));
  console.log('  Bloqueado: €' + (userBefore.blockedCredits/100).toFixed(2));
  console.log('  Disponible: €' + ((userBefore.credits - userBefore.blockedCredits)/100).toFixed(2));
  
  // 2. Calcular correcto
  const pendingBookings = await prisma.booking.findMany({
    where: {
      userId,
      status: 'PENDING'
    },
    select: {
      amountBlocked: true
    }
  });
  
  const totalBlocked = pendingBookings.reduce((sum, b) => sum + (b.amountBlocked || 0), 0);
  
  console.log('\n📊 Cálculo:');
  console.log('  Reservas PENDING:', pendingBookings.length);
  console.log('  Total bloqueado calculado: €' + (totalBlocked/100).toFixed(2));
  
  // 3. Actualizar
  await prisma.user.update({
    where: { id: userId },
    data: { blockedCredits: totalBlocked }
  });
  
  // 4. Estado DESPUÉS
  const userAfter = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true, blockedCredits: true }
  });
  
  console.log('\nDESPUÉS:');
  console.log('  Total: €' + (userAfter.credits/100).toFixed(2));
  console.log('  Bloqueado: €' + (userAfter.blockedCredits/100).toFixed(2));
  console.log('  Disponible: €' + ((userAfter.credits - userAfter.blockedCredits)/100).toFixed(2));
  
  console.log('\n✅ Créditos bloqueados actualizados correctamente');
  
  await prisma.$disconnect();
}

fixBlockedCredits().catch(console.error);
