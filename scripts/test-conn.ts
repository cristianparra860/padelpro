
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    console.log('Connecting...')
    const users = await prisma.user.findMany({
        take: 1,
        select: { id: true, email: true }
    })
    console.log('Connected! Users found:', users.length)
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
