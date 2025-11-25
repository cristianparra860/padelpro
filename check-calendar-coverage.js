// Verificar cobertura del calendario (ventana de 30 días)
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCalendarCoverage() {
  try {
    console.log('📅 Checking calendar coverage (30-day window)...\n');

    const today = new Date();
    
    // Verificar cada uno de los próximos 30 días
    for (let dayOffset = 0; dayOffset <= 30; dayOffset++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() + dayOffset);
      const dateStr = checkDate.toISOString().split('T')[0];

      // Contar propuestas para este día
      const proposals = await prisma.timeSlot.count({
        where: {
          start: {
            gte: new Date(`${dateStr}T00:00:00.000Z`),
            lt: new Date(`${dateStr}T23:59:59.999Z`)
          },
          courtId: null // Solo propuestas
        }
      });

      // Contar clases confirmadas
      const confirmed = await prisma.timeSlot.count({
        where: {
          start: {
            gte: new Date(`${dateStr}T00:00:00.000Z`),
            lt: new Date(`${dateStr}T23:59:59.999Z`)
          },
          courtId: { not: null } // Solo confirmadas
        }
      });

      const total = proposals + confirmed;
      const status = proposals > 0 ? '✅' : '⚠️';
      const dayName = checkDate.toLocaleDateString('es-ES', { weekday: 'short' });

      console.log(`${status} Day +${dayOffset.toString().padStart(2, ' ')} (${dayName} ${dateStr}): ${proposals.toString().padStart(3, ' ')} proposals, ${confirmed.toString().padStart(2, ' ')} confirmed | Total: ${total.toString().padStart(3, ' ')}`);
    }

    console.log('\n📊 Summary:');
    
    // Resumen total
    const totalProposals = await prisma.timeSlot.count({
      where: {
        start: {
          gte: today,
          lt: new Date(today.getTime() + 31 * 24 * 60 * 60 * 1000)
        },
        courtId: null
      }
    });

    const totalConfirmed = await prisma.timeSlot.count({
      where: {
        start: {
          gte: today,
          lt: new Date(today.getTime() + 31 * 24 * 60 * 60 * 1000)
        },
        courtId: { not: null }
      }
    });

    console.log(`   Total proposals (next 30 days): ${totalProposals}`);
    console.log(`   Total confirmed (next 30 days): ${totalConfirmed}`);
    console.log(`   Total classes: ${totalProposals + totalConfirmed}`);
    console.log('');
    console.log('💡 Cron runs daily at 00:00 UTC to maintain this window');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkCalendarCoverage();
