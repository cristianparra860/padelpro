const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const user = await prisma.user.findUnique({
    where: { id: 'user-1763677110798-mq6nvxq88' },
    select: { name: true, credits: true, points: true, email: true }
  });
  
  const bookings = await prisma.booking.findMany({
    where: { 
      userId: 'user-1763677110798-mq6nvxq88',
      status: 'CONFIRMED'
    },
    include: {
      timeSlot: {
        include: {
          instructor: { select: { name: true } },
          court: { select: { number: true } }
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 3
  });
  
  console.log('👤 Usuario:', user.name);
  console.log('📧 Email:', user.email);
  console.log('💰 Créditos:', user.credits);
  console.log('🏆 Puntos:', user.points);
  console.log('\n📋 Bookings CONFIRMED (' + bookings.length + '):');
  
  bookings.forEach((b, i) => {
    console.log(`\n${i+1}. ID: ${b.id}`);
    console.log(`   Fecha: ${new Date(b.timeSlot.start).toLocaleString('es-ES')}`);
    console.log(`   Status: ${b.status}`);
    console.log(`   Amount: €${b.amountBlocked}`);
    console.log(`   Instructor: ${b.timeSlot.instructor.name}`);
    console.log(`   Court: ${b.timeSlot.court ? b.timeSlot.court.number : 'null'}`);
  });
  
  await prisma.$disconnect();
}

check();
