const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    try {
        console.log('Testing MatchGame queries...');

        // Test 1: Count matchgames
        const count = await prisma.matchGame.count({ where: { clubId: 'prod-club-1' } });
        console.log(`Total MatchGames for prod-club-1: ${count}`);

        // Test 2: Get one matchgame with bookings
        const matchGames = await prisma.matchGame.findMany({
            where: { clubId: 'prod-club-1' },
            include: {
                MatchGameBooking: {
                    include: {
                        User: {
                            select: {
                                id: true,
                                name: true,
                                email: true
                            }
                        }
                    }
                }
            },
            take: 1
        });

        console.log(`Found ${matchGames.length} matchgames`);
        if (matchGames.length > 0) {
            console.log('First matchgame:', JSON.stringify(matchGames[0], null, 2));
        }

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

test();
