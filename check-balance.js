const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUserBalance() {
    try {
        // Buscar el usuario PLAYER
        const user = await prisma.user.findFirst({
            where: {
                role: 'PLAYER'
            },
            orderBy: {
                createdAt: 'asc'
            }
        });

        if (!user) {
            console.log('❌ No se encontró ningún usuario PLAYER');
            return;
        }

        console.log('=== INFORMACIÓN DEL USUARIO ===');
        console.log(`👤 Nombre: ${user.name}`);
        console.log(`🆔 ID: ${user.id}`);
        console.log(`\n💰 SALDO:`);
        console.log(`   Credits: ${user.credits} céntimos = €${(user.credits / 100).toFixed(2)}`);
        console.log(`   Blocked: ${user.blockedCredits} céntimos = €${(user.blockedCredits / 100).toFixed(2)}`);
        console.log(`   Available: ${user.credits - user.blockedCredits} céntimos = €${((user.credits - user.blockedCredits) / 100).toFixed(2)}`);

        console.log(`\n🎁 PUNTOS:`);
        console.log(`   Points: ${user.points}`);
        console.log(`   Blocked Points: ${user.blockedPoints}`);
        console.log(`   Available Points: ${user.points - user.blockedPoints}`);

        // Verificar inscripciones pendientes
        const pendingBookings = await prisma.booking.findMany({
            where: {
                userId: user.id,
                status: 'PENDING'
            },
            include: {
                TimeSlot: {
                    select: {
                        start: true,
                        courtId: true
                    }
                }
            }
        });

        console.log(`\n📋 INSCRIPCIONES PENDIENTES: ${pendingBookings.length}`);
        if (pendingBookings.length > 0) {
            pendingBookings.forEach((b, i) => {
                console.log(`   ${i + 1}. Booking ${b.id.substring(0, 8)}...`);
                console.log(`      - Monto bloqueado: ${b.amountBlocked} céntimos = €${(b.amountBlocked / 100).toFixed(2)}`);
                console.log(`      - Fecha: ${b.TimeSlot.start}`);
                console.log(`      - Tiene pista: ${b.TimeSlot.courtId ? 'Sí' : 'No'}`);
            });
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkUserBalance();
