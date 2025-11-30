// src/components/user/CreditMovementsDialog.tsx
"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Wallet, Trophy } from 'lucide-react';
import type { User as UserType, Transaction } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface CreditMovementsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser: UserType;
}

const CreditMovementsDialog: React.FC<CreditMovementsDialogProps> = ({
  isOpen,
  onOpenChange,
  currentUser,
}) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (isOpen) {
        setLoading(true);
        try {
          // Cargar transacciones desde la API
          const response = await fetch(`/api/users/${currentUser.id}/transactions?limit=50`);
          if (response.ok) {
            const data = await response.json();
            
            // Separar transacciones de créditos y puntos
            const allTransactions = data.transactions;
            
            // Mapear transacciones de la DB al formato del componente
            const mappedTransactions: Transaction[] = allTransactions.map((tx: any) => {
              // Determinar si es entrada (+) o salida (-)
              const isPositive = tx.action === 'add' || tx.action === 'refund' || tx.action === 'unblock';
              // El amount ya está en euros/puntos en la base de datos, no dividir por 100
              const amount = tx.amount;
              
              return {
                id: tx.id,
                userId: tx.userId,
                type: tx.concept,
                description: tx.concept,
                amount: isPositive ? amount : -amount,
                date: tx.createdAt,
                balanceAfter: tx.balance,
                transactionType: tx.type // 'credit' o 'points'
              };
            });
            
            // Calcular saldos históricos para ambos tipos
            // Partimos del saldo actual y vamos hacia atrás
            let currentCreditBalance = currentUser.credit ?? 0;
            let currentPointsBalance = currentUser.points ?? 0;
            
            // Recorrer hacia atrás para calcular saldos históricos
            const transactionsWithHistoricBalances = mappedTransactions.map((tx: any) => {
              const historicCreditBalance = tx.transactionType === 'credit' ? tx.balanceAfter : currentCreditBalance;
              const historicPointsBalance = tx.transactionType === 'points' ? tx.balanceAfter : currentPointsBalance;
              
              // Preparar para la siguiente iteración (hacia atrás en el tiempo)
              if (tx.transactionType === 'credit') {
                currentCreditBalance = tx.balanceAfter;
              } else {
                currentPointsBalance = tx.balanceAfter;
              }
              
              return {
                ...tx,
                historicCreditBalance,
                historicPointsBalance
              };
            });
            
            setTransactions(transactionsWithHistoricBalances);
          } else {
            console.error('Error fetching transactions:', response.statusText);
            setTransactions([]);
          }

        } catch (error) {
          console.error("Error fetching movements data:", error);
        } finally {
          setLoading(false);
        }
      }
    };
    loadData();
  }, [isOpen, currentUser.id, currentUser.credit, currentUser.points]);

  // Usar blockedCredits (con 's') que es como viene de la API
  const totalCredit = currentUser.credit ?? 0;
  const blockedCredit = (currentUser as any).blockedCredits ?? 0;
  const availableCredit = totalCredit - blockedCredit;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center text-xl">
            <Wallet className="mr-2 h-6 w-6 text-primary" />
            Movimientos de Saldo
          </DialogTitle>
          <DialogDescription className="text-base text-muted-foreground">
            Consulta tu saldo disponible, el crédito bloqueado por pre-inscripciones y tu historial de transacciones.
          </DialogDescription>
        </DialogHeader>

        <div className="my-2 p-5 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border-2 border-gray-200">
            <div className="grid grid-cols-2 gap-6">
                {/* Columna izquierda: Euros */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                        <Wallet className="h-5 w-5 text-blue-600" />
                        <h3 className="font-bold text-lg text-gray-800">Saldo en Euros</h3>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                        <p className="text-xs text-gray-600 mb-1">Saldo</p>
                        <p className="text-3xl font-bold text-gray-900">{totalCredit.toFixed(0)}€</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                        <p className="text-xs text-gray-600 mb-1">Bloqueado</p>
                        <p className="text-xl font-semibold text-gray-700">{blockedCredit.toFixed(0)} B</p>
                    </div>
                </div>
                
                {/* Columna derecha: Puntos */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                        <Trophy className="h-5 w-5 text-yellow-600" />
                        <h3 className="font-bold text-lg text-gray-800">Saldo en Puntos</h3>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                        <p className="text-xs text-gray-600 mb-1">Saldo</p>
                        <p className="text-3xl font-bold text-gray-900">{currentUser.points || 0} Ptos.</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                        <p className="text-xs text-gray-600 mb-1">Bloqueado</p>
                        <p className="text-xl font-semibold text-gray-700">0 Ptos.</p>
                    </div>
                </div>
            </div>
        </div>

        <ScrollArea className="h-[400px] my-2 pr-3">
            {/* Unified Transaction History */}
            <div className="space-y-3">
                <h4 className="font-semibold text-base text-foreground mb-3">
                    Historial de Movimientos
                </h4>
                
                {loading ? (
                    <p className="text-base text-muted-foreground">Cargando...</p>
                ) : transactions.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic p-3 bg-muted/50 rounded-md">
                        No tienes movimientos registrados.
                    </p>
                ) : (
                    transactions.map((txn: any, index: number) => {
                        const isCredit = txn.transactionType === 'credit';
                        const isPositive = txn.amount > 0;
                        
                        return (
                            <div key={txn.id} className="border-2 border-gray-200 rounded-xl overflow-hidden">
                                {/* Header con fecha */}
                                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                    <p className="text-sm font-medium text-gray-700">
                                        {format(new Date(txn.date), "d 'de' MMMM 'a las' HH:mm'h'", { locale: es })}
                                    </p>
                                </div>
                                
                                {/* Concepto principal */}
                                <div className="bg-green-100 px-4 py-3 text-center">
                                    <p className="text-sm font-semibold text-gray-800">
                                        {txn.description}
                                    </p>
                                </div>
                                
                                {/* Saldos */}
                                <div className="bg-white px-4 py-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        {/* Columna izquierda: Saldo en Euros */}
                                        <div className="space-y-3">
                                            <div className="border rounded-lg p-3 bg-gray-50">
                                                <p className="text-xs text-gray-600 mb-1">Saldo</p>
                                                <p className="text-xl font-bold text-gray-900">
                                                    {txn.historicCreditBalance?.toFixed(0) || 0}€
                                                </p>
                                            </div>
                                            <div className="border rounded-lg p-3 bg-gray-50">
                                                <p className="text-xs text-gray-600 mb-1">Bloqueado</p>
                                                <p className="text-base font-semibold text-gray-700">
                                                    {blockedCredit.toFixed(0)} B
                                                </p>
                                            </div>
                                        </div>
                                        
                                        {/* Columna derecha: Saldo en Puntos */}
                                        <div className="space-y-3">
                                            <div className="border rounded-lg p-3 bg-gray-50">
                                                <p className="text-xs text-gray-600 mb-1">Saldo</p>
                                                <p className="text-xl font-bold text-gray-900">
                                                    {txn.historicPointsBalance || 0} Ptos.
                                                </p>
                                            </div>
                                            <div className="border rounded-lg p-3 bg-gray-50">
                                                <p className="text-xs text-gray-600 mb-1">Bloqueado</p>
                                                <p className="text-base font-semibold text-gray-700">
                                                    0 Ptos.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </ScrollArea>

        <DialogFooter className="mt-4">
          <DialogClose asChild>
            <Button type="button" variant="outline" className="w-full text-base">
              Cerrar
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreditMovementsDialog;
