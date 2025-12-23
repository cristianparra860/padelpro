const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkClubAdmin() {
    const user = await prisma.user.findUnique({
        where: { email: 'club.admin@padelpro.com' },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            clubId: true,
            club: {
                select: {
                    id: true,
                    name: true
                }
            }
        }
    });

    console.log('👤 Usuario Club Admin:');
    console.log(JSON.stringify(user, null, 2));

    if (!user.clubId) {
        console.log('\n⚠️  PROBLEMA: El usuario no tiene clubId asignado');
        console.log('Asignando club "padel-estrella-madrid"...');
        
        const updated = await prisma.user.update({
            where: { id: user.id },
            data: { clubId: 'padel-estrella-madrid' }
        });
        
        console.log('✅ Club asignado:', updated.clubId);
    }

    await prisma.$disconnect();
}

checkClubAdmin();
