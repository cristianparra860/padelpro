const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLogos() {
    const clubs = await prisma.club.findMany();
    
    console.log('🏢 Clubs y logos:');
    clubs.forEach(club => {
        console.log(`\n${club.name}:`);
        console.log(`  ID: ${club.id}`);
        console.log(`  logo: ${club.logo || 'NULL'}`);
    });
    
    await prisma.$disconnect();
}

checkLogos();
