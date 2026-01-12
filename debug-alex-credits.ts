
import { prisma } from './src/lib/prisma';
import { updateUserBlockedCredits } from './src/lib/blockedCredits';

async function main() {
    const email = 'alex@example.com';

    console.log(`Searching for user with email: ${email}`);

    const user = await prisma.user.findUnique({
        where: { email },
        include: {
            bookings: {
                where: { status: 'PENDING' },
                include: {
                    timeSlot: true
                }
            }
        }
    });

    if (!user) {
        console.log('User not found.');
        return;
    }

    console.log(`User found: ${user.name} (${user.id})`);
    console.log(`Current Credits: ${user.credits}`);
    console.log(`Blocked Credits (in DB): ${user.blockedCredits}`);

    console.log('\n--- Pending Bookings (Potential Blockers) ---');
    if (user.bookings.length === 0) {
        console.log('No pending bookings found.');
    } else {
        user.bookings.forEach((b, index) => {
            console.log(`\n[Booking ${index + 1}]`);
            console.log(`  ID: ${b.id}`);
            console.log(`  Amount Blocked: ${b.amountBlocked}`);
            console.log(`  TimeSlot Start: ${b.timeSlot.start}`);
            console.log(`  Current Time: ${new Date()}`);
            console.log(`  Is Future? ${new Date(b.timeSlot.start) > new Date()}`);
        });
    }

    console.log('\n--- Recalculating Blocked Credits ---');
    const newBlocked = await updateUserBlockedCredits(user.id);
    console.log(`New Blocked Credits: ${newBlocked}`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
