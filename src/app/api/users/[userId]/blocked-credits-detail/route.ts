
import { NextResponse } from 'next/server';
import { getBlockedCreditsBreakdown } from '@/lib/blockedCredits';

export async function GET(
    request: Request,
    { params }: { params: { userId: string } }
) {
    try {
        const userId = params.userId;

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        const breakdown = await getBlockedCreditsBreakdown(userId);

        // Calcular el total bloqueado sumando los montos (que ya son máximos por día)
        let totalBlocked = 0;
        const breakdownArray = Object.values(breakdown);

        breakdownArray.forEach(item => {
            totalBlocked += item.amount;
        });

        return NextResponse.json({
            breakdown: breakdownArray.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
            totalBlocked
        });

    } catch (error) {
        console.error('Error getting blocked credits breakdown:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
