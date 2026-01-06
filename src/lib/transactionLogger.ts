import { prisma } from './prisma';

export type TransactionType = 'credit' | 'points';
export type TransactionAction = 'add' | 'subtract' | 'block' | 'unblock' | 'refund';

interface CreateTransactionParams {
  userId: string;
  type: TransactionType;
  action: TransactionAction;
  amount: number;
  balance: number;
  concept: string;
  relatedId?: string;
  relatedType?: string;
  metadata?: Record<string, any>;
}

/**
 * Registra una transacción en la base de datos
 * @param params Parámetros de la transacción
 * @returns La transacción creada
 */
export async function createTransaction(params: CreateTransactionParams) {
  const {
    userId,
    type,
    action,
    amount,
    balance,
    concept,
    relatedId,
    relatedType,
    metadata
  } = params;

  try {
    const transaction = await prisma.transaction.create({
      data: {
        userId,
        type,
        action,
        amount,
        balance,
        concept,
        relatedId,
        relatedType,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });

    console.log(`✅ Transaction logged: ${type} ${action} ${amount} for user ${userId}`);
    return transaction;
  } catch (error) {
    console.error('❌ Error creating transaction:', error);
    throw error;
  }
}

/**
 * Obtiene el historial de transacciones de un usuario
 * @param userId ID del usuario
 * @param limit Número máximo de transacciones a retornar
 * @returns Lista de transacciones
 */
export async function getUserTransactions(userId: string, limit = 50) {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return transactions;
  } catch (error) {
    console.error('❌ Error fetching transactions:', error);
    throw error;
  }
}

/**
 * Obtiene transacciones filtradas por tipo
 * @param userId ID del usuario
 * @param type Tipo de transacción (credit/points)
 * @param limit Número máximo de transacciones
 * @returns Lista de transacciones filtradas
 */
export async function getUserTransactionsByType(
  userId: string,
  type: TransactionType,
  limit = 50
) {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { userId, type },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return transactions;
  } catch (error) {
    console.error('❌ Error fetching transactions by type:', error);
    throw error;
  }
}
