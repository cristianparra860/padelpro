
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const user = await prisma.user.findFirst({
        where: {
            name: {
                contains: 'Alex',
                mode: 'insensitive'
            }
        }
    })
    console.log(user)
}

main()
    .catch(e => {
        throw e
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
