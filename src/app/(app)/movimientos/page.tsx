// src/app/(app)/movimientos/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Wallet, Trophy, ArrowLeft, Plus, Repeat } from 'lucide-react';
import type { User as UserType, Transaction } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import AddCreditDialog from '@/components/user/AddCreditDialog';
import ConvertBalanceDialog from '@/components/user/ConvertBalanceDialog';

const MovimientosPage: React.FC = () => {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [showAddCreditDialog, setShowAddCreditDialog] = useState(false);
  const [showConvertBalanceDialog, setShowConvertBalanceDialog] = useState(false);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        console.log('🔍 Cargando usuario actual para movimientos...');
        const response = await fetch('/api/auth/me');
        
        if (response.status === 401) {
          // No autenticado, redirigir al login
          console.warn('⚠️ Usuario no autenticado');
          router.push('/');
          return;
        }
        
        if (response.ok) {
          const data = await response.json();
          const userData = data.user;
          console.log('👤 Usuario cargado:', userData?.email);
          setCurrentUser(userData);
        }
      } catch (error) {
        console.error("❌ Error loading user data:", error);
      }
    };

    loadUserData();
  }, [router]);

  useEffect(() => {
    const loadTransactions = async () => {
      if (!currentUser?.id) return;

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
            
            // Convertir amount de céntimos a euros si es transacción de crédito
            const amountInDisplayUnit = tx.type === 'credit' 
              ? tx.amount / 100  // Convertir céntimos a euros
              : tx.amount;       // Los puntos se quedan igual
            
            return {
              id: tx.id,
              userId: tx.userId,
              type: tx.concept,
              description: tx.concept,
              amount: isPositive ? amountInDisplayUnit : -amountInDisplayUnit, // +X para add/refund, -X para subtract
              date: tx.createdAt,
              balanceAfter: tx.type === 'credit' ? tx.balance / 100 : tx.balance, // Convertir balance también
              transactionType: tx.type, // 'credit' o 'points'
              action: tx.action, // 'add', 'subtract', 'block', 'unblock', 'refund'
              rawAmount: amountInDisplayUnit // Guardar el amount original sin signo pero convertido
            };
          });
          
          // Calcular saldos históricos correctamente
          // Las transacciones vienen DESC (más reciente primero)
          // Vamos a calcular HACIA ATRÁS desde el saldo actual
          
          // Saldo actual real de la BD (convertir céntimos a euros)
          const currentCreditBalance = (currentUser.credits ?? 0) / 100;
          const currentPointsBalance = currentUser.points ?? 0;
          
          // Calcular hacia atrás: por cada transacción, restar el movimiento
          let runningCreditBalance = currentCreditBalance;
          let runningPointsBalance = currentPointsBalance;
          
          const transactionsWithHistoricBalances = mappedTransactions.map((tx: any, index: number) => {
            // Para la primera transacción (más reciente), el saldo DESPUÉS es el actual
            // Para las siguientes, vamos restando el movimiento
            
            // Saldo DESPUÉS de esta transacción
            const balanceAfterCreditCol = runningCreditBalance;
            const balanceAfterPointsCol = runningPointsBalance;
            
            // Calcular saldo ANTES restando el movimiento (hacia atrás en el tiempo)
            // Si tx.amount = +50 (se ganó dinero), antes tenía 50 menos
            // Si tx.amount = -20 (se gastó), antes tenía 20 más
            if (tx.transactionType === 'credit') {
              runningCreditBalance -= tx.amount; // Restar el movimiento para ir hacia atrás
            } else {
              runningPointsBalance -= tx.amount;
            }
            
            // Saldo ANTES de aplicar esta transacción
            const balanceBeforeCreditCol = runningCreditBalance;
            const balanceBeforePointsCol = runningPointsBalance;
            
            return {
              ...tx,
              // Para la columna que tiene movimiento
              balanceBefore: tx.transactionType === 'credit' ? balanceBeforeCreditCol : balanceBeforePointsCol,
              balanceAfter: tx.transactionType === 'credit' ? balanceAfterCreditCol : balanceAfterPointsCol,
              // Para ambas columnas (siempre mostrar saldo actual)
              creditBalanceBefore: balanceBeforeCreditCol,
              creditBalanceAfter: balanceAfterCreditCol,
              pointsBalanceBefore: balanceBeforePointsCol,
              pointsBalanceAfter: balanceAfterPointsCol
            };
          });
          
          // Filtrar solo transacciones con movimiento real (amount !== 0)
          // INCLUIR 'block' y 'unblock' para mostrar el historial completo de bloqueos
          const transactionsWithMovement = transactionsWithHistoricBalances.filter((tx: any) => 
            tx.amount !== 0
          );
          
          setTransactions(transactionsWithMovement);
        } else {
          console.error('Error fetching transactions:', response.statusText);
          setTransactions([]);
        }

      } catch (error) {
        console.error("Error fetching movements data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      loadTransactions();
    }
  }, [currentUser]);

  if (!currentUser) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-center text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  // Usar credits (sin 's' en el total, con 's' en el bloqueado)
  const totalCredit = ((currentUser as any).credits ?? 0) / 100; // Convertir céntimos a euros
  const blockedCredit = ((currentUser as any).blockedCredits ?? 0) / 100;
  const availableCredit = totalCredit - blockedCredit;
  
  const totalPoints = currentUser.points ?? 0;
  const blockedPoints = (currentUser as any).blockedPoints ?? 0;
  const availablePoints = totalPoints - blockedPoints;

  return (
    <div className="p-3 sm:p-6 max-w-4xl mx-auto mb-20 sm:mb-6 pl-20 sm:pl-20 md:pl-24">
      {/* Header */}
      <div className="mb-3">
        <Button 
          variant="ghost" 
          onClick={() => router.back()}
          className="mb-2 h-7 text-xs"
        >
          <ArrowLeft className="mr-1 h-3 w-3" />
          Volver
        </Button>
        
        <div className="flex items-center gap-1 mb-1">
          <Wallet className="h-4 w-4 text-primary" />
          <h1 className="text-lg font-bold">Movimientos de Saldo</h1>
        </div>
        <p className="text-xs text-muted-foreground">
          Consulta tu saldo disponible, el crédito bloqueado por pre-inscripciones y tu historial de transacciones.
        </p>
      </div>

      {/* Balance Summary - Franja Superior Mejorada */}
      <div className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-green-50 rounded-xl border-2 border-gray-300 shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Columna izquierda: Euros */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="h-5 w-5 text-blue-600" />
              <h3 className="font-bold text-base text-gray-800">Saldo en Euros</h3>
            </div>
            
            {/* Saldo Total */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 border-2 border-blue-700 shadow-md">
              <p className="text-xs text-white/80 mb-1">Saldo Total</p>
              <p className="text-3xl font-bold text-white">{totalCredit.toFixed(0)}€</p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                <p className="text-xs text-gray-600 mb-1">Disponible</p>
                <p className="text-xl font-bold text-green-600">{availableCredit.toFixed(0)}€</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                <p className="text-xs text-gray-600 mb-1">Bloqueado</p>
                <p className="text-xl font-bold text-orange-600">{blockedCredit.toFixed(0)}€</p>
              </div>
            </div>
          </div>
          
          {/* Columna derecha: Puntos */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="h-5 w-5 text-yellow-600" />
              <h3 className="font-bold text-base text-gray-800">Saldo en Puntos</h3>
            </div>
            
            {/* Saldo Total */}
            <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg p-4 border-2 border-yellow-700 shadow-md">
              <p className="text-xs text-white/80 mb-1">Saldo Total</p>
              <p className="text-3xl font-bold text-white">{totalPoints} Ptos.</p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                <p className="text-xs text-gray-600 mb-1">Disponible</p>
                <p className="text-xl font-bold text-green-600">{availablePoints} Ptos.</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                <p className="text-xs text-gray-600 mb-1">Bloqueado</p>
                <p className="text-xl font-bold text-orange-600">{blockedPoints} Ptos.</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Botones de Acciones */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
          <Button
            onClick={() => setShowAddCreditDialog(true)}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold"
            size="lg"
          >
            <Plus className="mr-2 h-5 w-5" />
            Añadir Saldo
          </Button>
          <Button
            onClick={() => setShowConvertBalanceDialog(true)}
            variant="outline"
            className="border-2 border-purple-600 text-purple-700 hover:bg-purple-50 font-semibold"
            size="lg"
          >
            <Repeat className="mr-2 h-5 w-5" />
            Convertir Euros a Puntos
          </Button>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-lg border border-gray-200 p-2">
        <h2 className="font-semibold text-xs text-foreground mb-2">
          Historial de Movimientos
        </h2>
        
        {loading ? (
          <p className="text-xs text-muted-foreground">Cargando...</p>
        ) : transactions.length === 0 ? (
          <p className="text-[10px] text-muted-foreground italic p-2 bg-muted/50 rounded-md text-center">
            No tienes movimientos registrados.
          </p>
        ) : (
          <div className="space-y-2">
            {transactions.map((txn: any) => {
              const isCredit = txn.transactionType === 'credit';
              const isPositive = txn.amount > 0;
              
              // Todos los movimientos con amount !== 0 afectan el saldo disponible
              // (block reduce disponible, unblock aumenta disponible, add/subtract/refund también)
              
              // Formatear el movimiento con signo
              const movementText = isCredit 
                ? `${isPositive ? '+' : ''}${txn.amount.toFixed(0)}€`
                : `${isPositive ? '+' : ''}${txn.amount.toFixed(0)} Pts.`;
              
              // Usar los saldos calculados para ambas columnas
              const previousCreditBalance = txn.creditBalanceBefore || 0;
              const previousPointsBalance = txn.pointsBalanceBefore || 0;
              
              const currentCreditBalance = txn.creditBalanceAfter || 0;
              const currentPointsBalance = txn.pointsBalanceAfter || 0;
              
              // Determinar el color de fondo según el concepto
              const isCancellation = txn.description?.toLowerCase().includes('cancelación') || 
                                     txn.description?.toLowerCase().includes('cancelacion');
              const isConfirmedClass = txn.description?.toLowerCase().includes('clase confirmada');
              
              // Color del recuadro según tipo de transacción
              let cardBgColor = 'bg-gray-50'; // Por defecto
              let cardBorderColor = 'border-gray-200';
              if (isCancellation) {
                cardBgColor = 'bg-yellow-50';
                cardBorderColor = 'border-yellow-300';
              } else if (isConfirmedClass) {
                cardBgColor = 'bg-blue-50';
                cardBorderColor = 'border-blue-300';
              }
              
              return (
                <div key={txn.id} className="space-y-1">
                  {/* Fecha sin color de fondo */}
                  <p className="text-[10px] font-medium text-gray-600">
                    {format(new Date(txn.date), "EEEE d 'de' MMMM 'a las' HH:mm'h'", { locale: es })}
                  </p>
                  
                  {/* Concepto + Saldos integrados en un mismo recuadro */}
                  <div className={`border ${cardBorderColor} rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow ${cardBgColor}`}>
                    {/* Concepto principal */}
                    <div className="px-2 py-1.5 text-center border-b border-gray-200">
                      <p className="text-xs font-bold text-gray-900">
                        {txn.description}
                      </p>
                    </div>
                  
                    {/* Saldos */}
                    <div className="px-2 py-1.5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                      {/* Columna izquierda: Saldo en Euros */}
                      <div className={`border rounded-lg p-1.5 ${
                        isCredit ? 'bg-white border-blue-300' : 'bg-white border-gray-200'
                      }`}>
                        <div className="flex justify-between items-center mb-0.5">
                          <p className="text-[8px] text-gray-600">Después</p>
                          <p className="text-xs font-bold text-gray-900">
                            {currentCreditBalance.toFixed(0)}€
                          </p>
                        </div>
                        {isCredit && (
                          <div className="flex justify-center my-0.5">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              isPositive ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                            }`}>
                              {movementText}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between items-center">
                          <p className="text-[8px] text-gray-600">Anterior</p>
                          <p className="text-[10px] font-semibold text-gray-700">
                            {previousCreditBalance.toFixed(0)}€
                          </p>
                        </div>
                      </div>
                      
                      {/* Columna derecha: Saldo en Puntos */}
                      <div className={`border rounded-lg p-1 ${
                        !isCredit ? 'bg-white border-amber-300' : 'bg-white border-gray-200'
                      }`}>
                        <div className="flex justify-between items-center mb-0.5">
                          <p className="text-[8px] text-gray-600">Después</p>
                          <p className="text-xs font-bold text-gray-900">
                            {currentPointsBalance.toFixed(0)} Ptos.
                          </p>
                        </div>
                        {!isCredit && (
                          <div className="flex justify-center my-0.5">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              isPositive ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                            }`}>
                              {movementText}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between items-center">
                          <p className="text-[8px] text-gray-600">Anterior</p>
                          <p className="text-[10px] font-semibold text-gray-700">
                            {previousPointsBalance.toFixed(0)} Pts.
                          </p>
                        </div>
                      </div>
                    </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Diálogos */}
      {currentUser && (
        <>
          <AddCreditDialog
            isOpen={showAddCreditDialog}
            onOpenChange={setShowAddCreditDialog}
            userId={currentUser.id}
            onCreditAdded={(newBalance) => {
              // Actualizar el saldo del usuario
              setCurrentUser(prev => prev ? { ...prev, credit: newBalance } : null);
              // Recargar transacciones
              window.location.reload();
            }}
          />
          
          <ConvertBalanceDialog
            isOpen={showConvertBalanceDialog}
            onOpenChange={setShowConvertBalanceDialog}
            currentUser={currentUser}
            onConversionSuccess={(newCredit, newPoints) => {
              // Actualizar el usuario
              setCurrentUser(prev => prev ? { ...prev, credit: newCredit, points: newPoints } : null);
              // Recargar transacciones
              window.location.reload();
            }}
          />
        </>
      )}
    </div>
  );
};

export default MovimientosPage;
