import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding production users...');

    // Ensure club exists
    await prisma.club.upsert({
        where: { id: 'club-1' },
        update: {},
        create: {
            id: 'club-1',
            name: 'Padel Estrella Madrid',
            address: 'Calle Principal 123',
            email: 'club.admin@padelpro.com',
            updatedAt: new Date()
        }
    });

    const hashedPassword = await bcrypt.hash('123456', 10);

    // Alex Garcia (User)
    console.log('Creating user: Alex García...');
    await prisma.user.upsert({
        where: { email: 'alex@example.com' },
        update: {},
        create: {
            id: 'user-alex',
            email: 'alex@example.com',
            name: 'Alex García',
            password: hashedPassword,
            role: 'PLAYER',
            level: 'intermedio',
            clubId: 'club-1',
            updatedAt: new Date()
        }
    });

    // Pedro Lopez (Instructor)
    console.log('Creating instructor: Pedro López...');
    // Create user for instructor first
    const instructorUser = await prisma.user.upsert({
        where: { email: 'pedro@example.com' },
        update: {},
        create: {
            id: 'user-pedro',
            email: 'pedro@example.com',
            name: 'Pedro López',
            password: hashedPassword,
            role: 'INSTRUCTOR',
            clubId: 'club-1',
            updatedAt: new Date()
        }
    });

    // Create instructor profile
    await prisma.instructor.upsert({
        where: { userId: instructorUser.id },
        update: {},
        create: {
            id: 'instructor-pedro',
            userId: instructorUser.id,
            name: 'Pedro López',
            clubId: 'club-1',
            updatedAt: new Date()
        }
    });

    console.log('✅ Production users seeded!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
