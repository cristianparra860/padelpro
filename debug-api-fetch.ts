
import { prisma } from './src/lib/prisma';

async function main() {
    console.log('🔍 Debugging API Fetch Logic...');

    // 1. Find the instructor
    const user = await prisma.user.findFirst({
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

    if (!user || !user.Instructor) {
        console.log('❌ No instructor found.');
        return;
    }

    const instructorId = user.Instructor.id;
    const clubId = user.Instructor.clubId;
    console.log(`✅ Instructor: ${user.name} (${instructorId})`);
    console.log(`✅ ClubId from DB: ${clubId}`);

    // 2. Simulate GET request for date 2026-01-21
    const dateStr = '2026-01-21';

    // URL that ManagedSlotsList would call (clubId might be undefined)
    // If undefined, param is missing.
    console.log(`\n--- Test 1: Fetching WITHOUT clubId param (Simulating ManagedSlotsList with undefined clubId) ---`);
    // We cannot use fetch here easily against localhost:3000 inside this script without running server?
    // We can simulate the Prisma query logic used in route.ts.

    const whereConditions1: any = {
        instructorId: instructorId,
        start: {
            gte: new Date(dateStr + 'T00:00:00.000Z'),
            lte: new Date(dateStr + 'T23:59:59.999Z')
        }
    };

    const slots1 = await prisma.timeSlot.findMany({
        where: whereConditions1,
        orderBy: { start: 'asc' }
    });
    console.log(`Found ${slots1.length} slots.`);

    // URL that InstructorClassCards would call (uses clubId)
    console.log(`\n--- Test 2: Fetching WITH clubId param (Simulating InstructorClassCards) ---`);
    const whereConditions2: any = {
        instructorId: instructorId,
        clubId: clubId, // Using real clubId
        start: {
            gte: new Date(dateStr + 'T00:00:00.000Z'),
            lte: new Date(dateStr + 'T23:59:59.999Z')
        }
    };

    const slots2 = await prisma.timeSlot.findMany({
        where: whereConditions2,
        orderBy: { start: 'asc' }
    });
    console.log(`Found ${slots2.length} slots.`);

    // 3. Test POST creation logic
    console.log(`\n--- Test 3: Simulating POST Creation ---`);
    const startTime = new Date('2026-01-25T10:00:00.000Z'); // Day 25
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

    // Verify constraints
    const verifyClub = await prisma.club.findUnique({ where: { id: clubId } });
    console.log(`Club ${clubId} exists? ${!!verifyClub}`);

    const verifyInstructor = await prisma.instructor.findUnique({ where: { id: instructorId } });
    console.log(`Instructor ${instructorId} exists? ${!!verifyInstructor}`);

    try {
        // Create a test slot directly in DB to see if it works
        const newSlot = await prisma.timeSlot.create({
            data: {
                clubId: clubId,
                instructorId: instructorId,
                start: startTime,
                end: endTime,
                maxPlayers: 4,
                level: 'abierto',
                category: 'abierta',
                totalPrice: 10,
                instructorPrice: 10,
                courtRentalPrice: 0,
                courtId: null,
                courtNumber: null
            }
        });
        console.log(`✅ Manually created slot: ${newSlot.id}`);
        // Cleanup
        await prisma.timeSlot.delete({ where: { id: newSlot.id } });
        console.log(`✅ Deleted test slot.`);
    } catch (e) {
        console.error(`❌ Creation failed:`, e);
    }

}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
