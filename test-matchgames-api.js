const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testMatchGamesAPI() {
    try {
        console.log('Testing exact API query...\n');

        const clubId = 'prod-club-1';
        const date = '2026-01-23';

        // Crear rango de fecha para el día completo
        const startOfDay = new Date(date + 'T00:00:00.000Z');
        const endOfDay = new Date(date + 'T23:59:59.999Z');

        console.log('Date range:', { startOfDay, endOfDay });

        const whereConditions = {
            clubId,
            start: {
                gte: startOfDay,
                lte: endOfDay
            }
        };

        console.log('\n1. Testing basic query...');
        const basicMatches = await prisma.matchGame.findMany({
            where: whereConditions,
            take: 1
        });
        console.log(`✅ Basic query works: ${basicMatches.length} matches found`);

        console.log('\n2. Testing with MatchGameBooking include...');
        const matchesWithBookings = await prisma.matchGame.findMany({
            where: whereConditions,
            include: {
                MatchGameBooking: true
            },
            take: 1
        });
        console.log(`✅ With MatchGameBooking: ${matchesWithBookings.length} matches found`);

        console.log('\n3. Testing with nested User include...');
        const matchesWithUsers = await prisma.matchGame.findMany({
            where: whereConditions,
            include: {
                MatchGameBooking: {
                    include: {
                        User: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                profilePictureUrl: true,
                                level: true,
                                position: true
                            }
                        }
                    }
                }
            },
            take: 1
        });
        console.log(`✅ With nested User: ${matchesWithUsers.length} matches found`);
        console.log('Sample:', JSON.stringify(matchesWithUsers[0], null, 2));

        console.log('\n4. Testing Court query...');
        const allCourts = await prisma.court.findMany({
            where: { clubId, isActive: true },
            select: { id: true, number: true },
            orderBy: { number: 'asc' }
        });
        console.log(`✅ Courts found: ${allCourts.length}`);

        console.log('\n5. Testing CourtSchedule query...');
        const allBlockingSchedules = await prisma.courtSchedule.findMany({
            where: {
                startTime: {
                    gte: startOfDay,
                    lte: endOfDay
                },
                isOccupied: true,
                court: { clubId }
            },
            select: {
                courtId: true,
                startTime: true,
                endTime: true
            },
            take: 5
        });
        console.log(`✅ CourtSchedule found: ${allBlockingSchedules.length}`);

        console.log('\n✅ All queries successful!');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        await prisma.$disconnect();
    }
}

testMatchGamesAPI();
