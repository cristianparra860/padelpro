const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateCredits() {
    try {
        // Buscar el usuario actual (asumiendo que es Alex Garcia o el primer PLAYER)
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

        console.log(`👤 Usuario encontrado: ${user.name} (${user.id})`);
        console.log(`💰 Créditos actuales: ${user.credits} céntimos = €${(user.credits / 100).toFixed(2)}`);
        console.log(`🔒 Créditos bloqueados: ${user.blockedCredits} céntimos = €${(user.blockedCredits / 100).toFixed(2)}`);

        // Actualizar a €20,000 (2,000,000 céntimos)
        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: {
                credits: 2000000 // €20,000 en céntimos
            }
        });

        console.log(`\n✅ Créditos actualizados exitosamente!`);
        console.log(`💰 Nuevos créditos: ${updatedUser.credits} céntimos = €${(updatedUser.credits / 100).toFixed(2)}`);
        console.log(`💵 Disponibles: ${updatedUser.credits - updatedUser.blockedCredits} céntimos = €${((updatedUser.credits - updatedUser.blockedCredits) / 100).toFixed(2)}`);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

updateCredits();
