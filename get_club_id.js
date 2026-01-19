
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const club = await prisma.club.findFirst();
    console.log('Club ID:', club ? club.id : 'No club found');
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
