
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSlots() {
    try {
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

        console.log('Checking slots from', startOfDay.toISOString(), 'to', endOfDay.toISOString());

        const slots = await prisma.timeSlot.findMany({
            where: {
                start: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            },
            include: {
                instructor: {
                    include: { user: true }
                }
            }
        });

        console.log(`Found ${slots.length} slots.`);
        slots.forEach(s => {
            console.log(`Slot ID: ${s.id}`);
            console.log(`- Start: ${s.start.toISOString()} (Local: ${s.start.toLocaleString()})`);
            console.log(`- Instructor: ${s.instructor?.user.name} (${s.instructorId})`);
            console.log(`- Club ID: ${s.clubId}`);
            console.log(`- Court ID: ${s.courtId}`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkSlots();
