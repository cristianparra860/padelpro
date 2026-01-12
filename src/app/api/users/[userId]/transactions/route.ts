import { NextRequest, NextResponse } from 'next/server';
import { getUserTransactions } from '@/lib/transactionLogger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const transactions = await getUserTransactions(userId, limit);

    // Parsear metadata de JSON string a object
    const parsedTransactions = transactions.map(tx => ({
      ...tx,
      metadata: tx.metadata ? JSON.parse(tx.metadata) : null,
      createdAt: tx.createdAt.toISOString()
    }));

    return NextResponse.json({
      success: true,
      transactions: parsedTransactions
    });

  } catch (error) {
    console.error('❌ Error fetching transactions:', error);
    return NextResponse.json({
      error: 'Error fetching transactions',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Usar prisma directamente ya que no hay funcion helper para delete
    const { prisma } = await import('@/lib/prisma');

    // Eliminar todas las transacciones del usuario
    const deleted = await prisma.transaction.deleteMany({
      where: { userId }
    });

    console.log(`🗑️ Deleted ${deleted.count} transactions for user ${userId}`);

    return NextResponse.json({
      success: true,
      count: deleted.count,
      message: 'Historial de transacciones eliminado correctamente'
    });

  } catch (error) {
    console.error('❌ Error deleting transactions:', error);
    return NextResponse.json({
      error: 'Error deleting transactions',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
