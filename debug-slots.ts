
import { prisma } from './src/lib/prisma';

async function main() {
    console.log('🔍 Debugging TimeSlots...');

    // 1. Find the instructor "Pedro Lopez" (or similar)
    const users = await prisma.user.findMany({
        where: {
            OR: [
                { name: { contains: 'Pedro', mode: 'insensitive' } },
                { email: { contains: 'pedro', mode: 'insensitive' } }
            ]
        },
        include: {
            Instructor: true
        }
    });

    console.log(`Found ${users.length} users matching "Pedro":`);
    let instructorId: string | null = null;

    for (const user of users) {
        console.log(`- User: ${user.name} (${user.email}) - Instructor: ${user.Instructor ? user.Instructor.id : 'No'}`);
        if (user.Instructor) {
            instructorId = user.Instructor.id;
        }
    }

    if (!instructorId) {
        // Try to find ANY instructor just in case
        const anyInstructor = await prisma.instructor.findFirst();
        if (anyInstructor) {
            console.log(`Fallback: Using first available instructor: ${anyInstructor.name} (${anyInstructor.id})`);
            instructorId = anyInstructor.id;
        } else {
            console.log('❌ No instructor found to debug.');
            return;
        }
    }

    // 2. Search for TimeSlots for this instructor
    console.log(`\nSearching TimeSlots for instructorId: ${instructorId}`);

    const slots = await prisma.timeSlot.findMany({
        where: {
            instructorId: instructorId
        },
        orderBy: { start: 'desc' },
        take: 10
    });

    console.log(`Found ${slots.length} recent slots:`);
    slots.forEach(slot => {
        console.log(`- ID: ${slot.id}`);
        console.log(`  Start: ${slot.start.toISOString()} (Local ~ ${slot.start.toLocaleString()})`);
        console.log(`  ClubId: ${slot.clubId}`);
        console.log(`  CourtId: ${slot.courtId}`);
        console.log(`  Level: ${slot.level}`);
    });

    // 3. Test the date filter logic used in API
    const dateStr = '2026-01-21'; // Today's date in conversation
    const startOfDay = new Date(dateStr + 'T00:00:00.000Z');
    const endOfDay = new Date(dateStr + 'T23:59:59.999Z');

    console.log(`\nTesting API Date Filter for ${dateStr}:`);
    console.log(`Range: ${startOfDay.toISOString()} - ${endOfDay.toISOString()}`);

    const filteredSlots = await prisma.timeSlot.findMany({
        where: {
            instructorId: instructorId,
            start: {
                gte: startOfDay,
                lte: endOfDay
            }
        }
    });

    console.log(`Found ${filteredSlots.length} slots in this range.`);
    filteredSlots.forEach(slot => {
        console.log(`- ID: ${slot.id} @ ${slot.start.toISOString()}`);
    });

}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
