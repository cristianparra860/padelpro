import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const query = searchParams.get('q');

        if (!query || query.trim().length < 2) {
            return NextResponse.json({ users: [] });
        }

        const searchTerm = query.trim().toLowerCase();

        // Search users by name or email
        const users = await prisma.user.findMany({
            where: {
                OR: [
                    {
                        name: {
                            contains: searchTerm,
                        },
                    },
                    {
                        email: {
                            contains: searchTerm,
                        },
                    },
                ],
            },
            select: {
                id: true,
                name: true,
                email: true,
                profilePictureUrl: true,
            },
            take: 20,
            orderBy: {
                name: 'asc',
            },
        });

        return NextResponse.json({ users });
    } catch (error) {
        console.error('Error searching users:', error);
        return NextResponse.json(
            { error: 'Failed to search users' },
            { status: 500 }
        );
    }
}
