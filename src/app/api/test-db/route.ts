
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
    try {
        const userCount = await prisma.user.count();
        const dbUrl = process.env.DATABASE_URL;
        // Mask the password in the URL for security
        const maskedUrl = dbUrl ? dbUrl.replace(/:([^:@]+)@/, ':****@') : 'NOT_DEFINED';

        return NextResponse.json({
            status: 'success',
            message: 'Database connection successful',
            userCount,
            databaseUrlConfigured: !!dbUrl,
            maskedUrl
        });
    } catch (error: any) {
        console.error('Database connection error:', error);
        return NextResponse.json({
            status: 'error',
            message: 'Database connection failed',
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}
