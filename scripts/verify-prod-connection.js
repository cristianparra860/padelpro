const { PrismaClient } = require('@prisma/client');

// Using the exact connection string intended for Vercel
const connectionString = "postgresql://postgres.zssourqimzraqcflifou:jFxmrx6i%3F6Ey%2BR%3F@aws-1-eu-central-2.pooler.supabase.com:6543/postgres?pgbouncer=true";

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: connectionString
        }
    }
});

async function main() {
    console.log("🔌 Testing connection to Supabase...");
    try {
        const userCount = await prisma.user.count();
        console.log(`✅ Connection SUCCESSFUL! Found ${userCount} users.`);

        const user = await prisma.user.findUnique({
            where: { email: 'alex@example.com' }
        });

        if (user) {
            console.log(`👤 Found user: ${user.name} (${user.email})`);
            console.log(`🔑 Role: ${user.role}`);
        } else {
            console.log("❌ User 'alex@example.com' NOT found.");
        }

    } catch (error) {
        console.error("❌ Connection FAILED:");
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
