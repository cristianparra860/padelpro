const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Testing Prisma Client...');

    // 1. Test TimeSlot fetch
    console.log('Fetching TimeSlots...');
    const slots = await prisma.timeSlot.findMany({
        take: 5
    });
    console.log(`Found ${slots.length} TimeSlots.`);
    if (slots.length > 0) {
        console.log('Sample Slot:', slots[0]);
    }

    // 2. Test Booking fetch with TimeSlot include (like in blockedCredits)
    console.log('\nFetching Bookings with TimeSlot...');
    try {
        const bookings = await prisma.booking.findMany({
            take: 1,
            include: { TimeSlot: true } // Testing PascalCase
        });
        console.log(`Found ${bookings.length} Bookings.`);
        if (bookings.length > 0) {
            console.log('Sample Booking TimeSlot:', bookings[0].TimeSlot ? 'Present' : 'Missing');
        }
    } catch (e) {
        console.error('Error fetching Booking with TimeSlot:', e.message);
    }

    // 3. Test TimeSlot with Booking include
    console.log('\nFetching TimeSlot with Booking...');
    try {
        const slotsWithBooking = await prisma.timeSlot.findMany({
            take: 1,
            include: { Booking: true } // Testing PascalCase
        });
        console.log(`Found ${slotsWithBooking.length} Slots with Booking.`);
        if (slotsWithBooking.length > 0) {
            console.log('Sample Slot Booking:', slotsWithBooking[0].Booking ? 'Present' : 'Missing');
            console.log('Bookings array:', slotsWithBooking[0].Booking);
        }
    } catch (e) {
        console.error('Error fetching TimeSlot with Booking:', e.message);
    }

}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
