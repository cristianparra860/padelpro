// Script de depuración para verificar reservas de pista
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugCourtReservations() {
  console.log('🔍 DEPURACIÓN: Reservas de pista en el calendario\n');
  
  try {
    // 1. Verificar usuario Alex García
    console.log('1️⃣ Verificando usuario...');
    const user = await prisma.user.findFirst({
      where: { email: 'alex.garcia@example.com' }
    });
    
    if (user) {
      console.log(`✅ Usuario: ${user.name}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Créditos: ${(Number(user.credits) / 100).toFixed(2)}€`);
    } else {
      console.log('❌ Usuario no encontrado');
      return;
    }
    
    // 2. Verificar reservas en CourtSchedule del usuario
    console.log('\n2️⃣ Buscando reservas de pista...');
    const courtSchedules = await prisma.courtSchedule.findMany({
      where: {
        reason: {
          contains: `user_court_reservation:${user.id}`
        }
      },
      include: {
        court: true
      },
      orderBy: {
        startTime: 'desc'
      },
      take: 10
    });
    
    if (courtSchedules.length > 0) {
      console.log(`✅ Encontradas ${courtSchedules.length} reservas:`);
      courtSchedules.forEach((schedule, index) => {
        const start = new Date(schedule.startTime);
        const end = new Date(schedule.endTime);
        const duration = Math.round((end - start) / 1000 / 60);
        
        console.log(`\n   ${index + 1}. ${schedule.court.name} (Pista ${schedule.court.number})`);
        console.log(`      ID: ${schedule.id}`);
        console.log(`      Fecha: ${start.toLocaleDateString('es-ES')}`);
        console.log(`      Hora: ${start.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`);
        console.log(`      Duración: ${duration} minutos`);
        console.log(`      Estado: ${schedule.isOccupied ? 'Ocupada' : 'Libre'}`);
      });
    } else {
      console.log('⚠️ No se encontraron reservas de pista para este usuario');
    }
    
    // 3. Verificar transacciones relacionadas
    console.log('\n3️⃣ Verificando transacciones...');
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        relatedType: 'court_reservation'
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    });
    
    if (transactions.length > 0) {
      console.log(`✅ Encontradas ${transactions.length} transacciones:`);
      transactions.forEach((tx, index) => {
        console.log(`\n   ${index + 1}. ${tx.concept}`);
        console.log(`      Monto: -${tx.amount}€`);
        console.log(`      Saldo después: ${tx.balance}€`);
        console.log(`      Fecha: ${new Date(tx.createdAt).toLocaleString('es-ES')}`);
        console.log(`      ID relacionado: ${tx.relatedId}`);
      });
    } else {
      console.log('⚠️ No se encontraron transacciones de reserva de pista');
    }
    
    // 4. Verificar reservas de hoy en adelante
    console.log('\n4️⃣ Reservas futuras (desde hoy)...');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const futureReservations = await prisma.courtSchedule.findMany({
      where: {
        startTime: {
          gte: today
        },
        reason: {
          contains: 'user_court_reservation'
        }
      },
      include: {
        court: true
      },
      orderBy: {
        startTime: 'asc'
      }
    });
    
    if (futureReservations.length > 0) {
      console.log(`✅ Encontradas ${futureReservations.length} reservas futuras:`);
      futureReservations.forEach((schedule, index) => {
        const start = new Date(schedule.startTime);
        const end = new Date(schedule.endTime);
        const duration = Math.round((end - start) / 1000 / 60);
        const userId = schedule.reason.split(':')[1];
        
        console.log(`\n   ${index + 1}. ${schedule.court.name} (Pista ${schedule.court.number})`);
        console.log(`      Usuario ID: ${userId}`);
        console.log(`      Fecha: ${start.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}`);
        console.log(`      Hora: ${start.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`);
        console.log(`      Duración: ${duration} minutos`);
      });
    } else {
      console.log('⚠️ No hay reservas futuras');
    }
    
    // 5. Verificar que el API del calendario las devuelve
    console.log('\n5️⃣ Verificando que el API del calendario incluye las reservas...');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const endOfTomorrow = new Date(tomorrow);
    endOfTomorrow.setHours(23, 59, 59, 999);
    
    const calendarReservations = await prisma.courtSchedule.findMany({
      where: {
        startTime: {
          gte: tomorrow,
          lte: endOfTomorrow
        }
      },
      include: {
        court: true
      }
    });
    
    console.log(`   Reservas en el calendario para mañana: ${calendarReservations.length}`);
    
    if (calendarReservations.length > 0) {
      calendarReservations.forEach((schedule, index) => {
        const start = new Date(schedule.startTime);
        console.log(`   ${index + 1}. Pista ${schedule.court.number} - ${start.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`);
      });
    }
    
    console.log('\n✅ Depuración completada');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugCourtReservations();
