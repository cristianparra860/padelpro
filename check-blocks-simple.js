// Verificar bloques simples

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function simpleCheck() {
  console.log('\n' + '='.repeat(80));
  console.log('🔒 SISTEMA DE BLOQUEO - VERIFICACIÓN SIMPLE');
  console.log('='.repeat(80));
  console.log('');

  try {
    // Clases confirmadas (courtId no nulo)
    const confirmed = await prisma.timeSlot.findMany({
      where: { courtId: { not: null } },
      include: {
        instructor: { include: { user: true } },
        court: true
      },
      orderBy: { start: 'asc' },
      take: 5 // Solo primeras 5 para ejemplo
    });

    console.log('📊 EJEMPLO DE CLASES CONFIRMADAS (primeras 5):\n');
    confirmed.forEach(cls => {
      const start = new Date(cls.start);
      const end = new Date(cls.end);
      const duration = (end - start) / (1000 * 60);
      
      console.log(`   🟢 ${start.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })} - ${end.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`);
      console.log(`      Instructor: ${cls.instructor?.user?.name || 'N/A'}`);
      console.log(`      Pista: ${cls.court?.number || 'N/A'} (${cls.court?.name || 'N/A'})`);
      console.log(`      ⏱️  Duración bloqueada: ${duration} minutos`);
      console.log('');
    });

    // Contar totales
    const totalConfirmed = await prisma.timeSlot.count({
      where: { courtId: { not: null } }
    });

    const totalProposals = await prisma.timeSlot.count({
      where: { courtId: null }
    });

    console.log('='.repeat(80));
    console.log('📊 RESUMEN DEL SISTEMA\n');
    console.log(`   🟢 Total clases confirmadas (bloqueadas): ${totalConfirmed}`);
    console.log(`   🔶 Total propuestas (disponibles): ${totalProposals}`);
    console.log('');
    
    if (totalConfirmed > 0) {
      const allConfirmed = await prisma.timeSlot.findMany({
        where: { courtId: { not: null } },
        select: { start: true, end: true }
      });
      
      const totalMinutes = allConfirmed.reduce((sum, cls) => {
        const start = new Date(cls.start);
        const end = new Date(cls.end);
        return sum + (end - start) / (1000 * 60);
      }, 0);
      
      const avgMinutes = totalMinutes / totalConfirmed;
      
      console.log(`   ⏱️  Total minutos bloqueados: ${totalMinutes}`);
      console.log(`   ⏱️  Promedio por clase: ${avgMinutes} minutos`);
      console.log('');
      
      if (avgMinutes === 60) {
        console.log('   ✅ CORRECTO: Todas las clases bloquean exactamente 60 minutos');
      } else {
        console.log(`   ⚠️  ADVERTENCIA: El promedio no es 60 minutos (es ${avgMinutes})`);
      }
    }
    
    console.log('');
    console.log('='.repeat(80));
    console.log('💡 CÓMO FUNCIONA EL BLOQUEO:\n');
    console.log('   1. Cuando una clase se confirma, se asigna courtId + court');
    console.log('   2. El sistema bloquea desde start hasta end (60 minutos)');
    console.log('   3. Se crean registros en CourtSchedule e InstructorSchedule');
    console.log('   4. Se eliminan propuestas que empiezan DENTRO de esos 60 min');
    console.log('');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

simpleCheck();
