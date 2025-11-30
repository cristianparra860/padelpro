const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkClassDates() {
  try {
    console.log('\n📅 VERIFICANDO CLASES CONFIRMADAS\n');
    
    const classes = await prisma.timeSlot.findMany({
      where: {
        courtId: { not: null }
      },
      include: {
        court: { select: { number: true } },
        instructor: { include: { user: { select: { name: true } } } },
        bookings: {
          where: { status: { in: ['PENDING', 'CONFIRMED'] } },
          include: { user: { select: { name: true, email: true } } }
        }
      },
      orderBy: { start: 'asc' }
    });
    
    console.log(`Total clases confirmadas: ${classes.length}\n`);
    
    classes.forEach((c, i) => {
      const d = new Date(c.start);
      const marcBooking = c.bookings.find(b => 
        b.user.email && (b.user.email.includes('marc') || b.user.email.includes('jugador1'))
      );
      
      console.log(`${i + 1}. ${d.toLocaleString('es-ES')}`);
      console.log(`   ID: ${c.id.substring(0, 20)}...`);
      console.log(`   Pista: ${c.court?.number || 'SIN PISTA'}`);
      console.log(`   Instructor: ${c.instructor?.user?.name || 'Sin instructor'}`);
      console.log(`   Bookings: ${c.bookings.length}`);
      if (marcBooking) {
        console.log(`   ⭐ Marc está en esta clase (${marcBooking.status})`);
      }
      console.log('');
    });
    
    // Verificar qué devolvería el API del calendario
    console.log('\n📆 SIMULANDO API /admin/calendar\n');
    
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    
    console.log(`Rango API: ${startDate.toLocaleDateString('es-ES')} - ${endDate.toLocaleDateString('es-ES')}`);
    
    const classesInRange = classes.filter(c => {
      const d = new Date(c.start);
      return d >= startDate && d <= endDate;
    });
    
    console.log(`Clases en rango del mes actual: ${classesInRange.length}\n`);
    
    if (classesInRange.length > 0) {
      classesInRange.forEach(c => {
        const d = new Date(c.start);
        console.log(`  ${d.toLocaleString('es-ES')} - Pista ${c.court?.number}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkClassDates();