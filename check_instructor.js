
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkInstructor() {
    try {
        const instructor = await prisma.instructor.findFirst({
            where: {
                user: {
                    name: { contains: 'Pedro' }
                }
            },
            include: {
                user: true
            }
        });

        console.log('Instructor found:', instructor ? instructor.user.name : 'None');
        if (instructor) {
            console.log('Is Active:', instructor.isActive);
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkInstructor();
