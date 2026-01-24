const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testBooking() {
    try {
        console.log('🧪 Testing booking logic...\n');

        // Get a user
        const user = await prisma.user.findFirst({
            where: { role: 'PLAYER' },
            select: {
                id: true,
                name: true,
                level: true,
                credits: true,
                blockedCredits: true
            }
        });

        if (!user) {
            console.log('❌ No user found');
            return;
        }

        console.log(`👤 User: ${user.name} (${user.id})`);
        console.log(`💰 Credits: ${user.credits}, Blocked: ${user.blockedCredits}`);

        // Get a timeslot
        const timeSlot = await prisma.timeSlot.findFirst({
            where: {
                start: { gte: new Date() },
                courtId: null
            },
            include: {
                Instructor: {
                    select: { id: true, name: true }
                },
                Booking: {
                    where: { status: { not: 'CANCELLED' } }
                }
            }
        });

        if (!timeSlot) {
            console.log('❌ No available timeslot found');
            return;
        }

        console.log(`\n📅 TimeSlot: ${timeSlot.start}`);
        console.log(`   Instructor: ${timeSlot.Instructor?.name || 'None'}`);
        console.log(`   Current bookings: ${timeSlot.Booking.length}/${timeSlot.maxPlayers}`);
        console.log(`   Total price: €${timeSlot.totalPrice}`);

        // Calculate price
        const groupSize = 1;
        const pricePerPerson = Number(timeSlot.totalPrice) / groupSize;
        const priceInCents = Math.round(pricePerPerson * 100);

        console.log(`\n💵 Price for ${groupSize} player(s): €${pricePerPerson} (${priceInCents} cents)`);

        // Check if user has enough credits
        const availableCredits = user.credits - user.blockedCredits;
        console.log(`💳 Available credits: ${availableCredits} cents`);

        if (availableCredits < priceInCents) {
            console.log(`❌ Insufficient credits! Need ${priceInCents}, have ${availableCredits}`);
            return;
        }

        console.log('✅ User has enough credits');

        // Try to create booking
        console.log('\n📝 Creating booking...');
        const booking = await prisma.booking.create({
            data: {
                userId: user.id,
                timeSlotId: timeSlot.id,
                groupSize,
                status: 'PENDING',
                paymentMethod: 'CREDITS',
                paidWithPoints: false,
                pointsUsed: 0,
                amountBlocked: priceInCents
            }
        });

        console.log(`✅ Booking created: ${booking.id}`);
        console.log(`   Status: ${booking.status}`);
        console.log(`   Amount blocked: ${booking.amountBlocked} cents`);

        // Clean up - delete the test booking
        await prisma.booking.delete({
            where: { id: booking.id }
        });

        console.log('\n🧹 Test booking deleted');
        console.log('\n✅ All tests passed!');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        await prisma.$disconnect();
    }
}

testBooking();
