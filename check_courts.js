
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCourts() {
    try {
        const clubs = await prisma.club.findMany();
        console.log('Clubs found:', clubs.length);

        for (const club of clubs) {
            console.log(`Club: ${club.name} (${club.id})`);
            const courts = await prisma.court.findMany({
                where: { clubId: club.id }
            });
            console.log(`- Total Courts: ${courts.length}`);

            const activeCourts = courts.filter(c => c.isActive);
            console.log(`- Active Courts: ${activeCourts.length}`);

            if (activeCourts.length === 0) {
                console.log('⚠️ ALERT: No active courts found! This will cause classes to be hidden.');
            }
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkCourts();
