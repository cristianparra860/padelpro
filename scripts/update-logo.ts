
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        // Assuming we want to update the first active club or a specific club if known
        // Based on previous context, clubId might be 'club-1' or we can find the first one.
        const club = await prisma.club.findFirst();

        if (!club) {
            console.log('No club found to update.');
            return;
        }

        console.log(`Updating logo for club: ${club.name} (${club.id})`);

        await prisma.club.update({
            where: { id: club.id },
            data: {
                logo: '/brand/logo-madrid.png'
            }
        });

        console.log('Logo updated successfully!');
    } catch (error) {
        console.error('Error updating logo:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
