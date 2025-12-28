const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
    try {
        const user = await prisma.user.findUnique({
            where: { email: 'carlos@padelclub.com' }
        });
        
        console.log('User ID:', user?.id);
        console.log('User Role:', user?.role);
        
        const instructor = await prisma.instructor.findFirst({
            where: { userId: user.id }
        });
        
        if (instructor) {
            console.log('✅ Instructor EXISTE');
            console.log('   ID:', instructor.id);
            console.log('   isActive:', instructor.isActive);
        } else {
            console.log('❌ Instructor NO EXISTE');
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

verify();
