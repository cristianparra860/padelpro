"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Wallet, Trophy, ArrowLeft, Plus, Repeat, Calendar, Clock, Award, LayoutGrid, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { User as UserType, Transaction } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import AddCreditDialog from '@/components/user/AddCreditDialog';
import ConvertBalanceDialog from '@/components/user/ConvertBalanceDialog';

const MovimientosPage: React.FC = () => {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [blockedBreakdown, setBlockedBreakdown] = useState<{ date: string; amount: number; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

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
    const loadData = async () => {
      if (!currentUser?.id) return;

      setLoading(true);
      try {
        // 1. Cargar desglose de bloqueos
        const breakdownRes = await fetch(`/api/users/${currentUser.id}/blocked-credits-detail`);
        if (breakdownRes.ok) {
          const breakdownData = await breakdownRes.json();
          setBlockedBreakdown(breakdownData.breakdown || []);
        }

        // 2. Cargar transacciones
        const response = await fetch(`/api/users/${currentUser.id}/transactions?limit=50`);
        if (response.ok) {
          const data = await response.json();

          const allTransactions = data.transactions;

          // Mapear transacciones
          const mappedTransactions: Transaction[] = allTransactions.map((tx: any) => {
            const isPositive = tx.action === 'add' || tx.action === 'refund' || tx.action === 'unblock';

            // All amounts are in cents/centipoints, so divide by 100 for display
            const amountInDisplayUnit = tx.amount / 100;

            return {
              id: tx.id,
              userId: tx.userId,
              type: tx.concept,
              description: tx.concept,
              amount: isPositive ? amountInDisplayUnit : -amountInDisplayUnit,
              date: tx.createdAt,
              balanceAfter: tx.type === 'credit' ? tx.balance / 100 : tx.balance,
              transactionType: tx.type,
              action: tx.action,
              rawAmount: amountInDisplayUnit
            };
          });

          // Calcular saldos históricos
          const currentCreditBalance = (currentUser.credits ?? 0) / 100;
          const currentPointsBalance = currentUser.points ?? 0;

          let runningCreditBalance = currentCreditBalance;
          let runningPointsBalance = currentPointsBalance;

          const transactionsWithHistoricBalances = mappedTransactions.map((tx: any) => {
            const balanceAfterCreditCol = runningCreditBalance;
            const balanceAfterPointsCol = runningPointsBalance;

            if (tx.transactionType === 'credit') {
              runningCreditBalance -= tx.amount;
            } else {
              runningPointsBalance -= tx.amount;
            }

            const balanceBeforeCreditCol = runningCreditBalance;
            const balanceBeforePointsCol = runningPointsBalance;

            return {
              ...tx,
              balanceBefore: tx.transactionType === 'credit' ? balanceBeforeCreditCol : balanceBeforePointsCol,
              balanceAfter: tx.transactionType === 'credit' ? balanceAfterCreditCol : balanceAfterPointsCol,
              creditBalanceBefore: balanceBeforeCreditCol,
              creditBalanceAfter: balanceAfterCreditCol,
              pointsBalanceBefore: balanceBeforePointsCol,
              pointsBalanceAfter: balanceAfterPointsCol
            };
          });

          // Filtrar movimientos reales
          const transactionsWithMovement = transactionsWithHistoricBalances.filter((tx: any) =>
            tx.amount !== 0
          );

          setTransactions(transactionsWithMovement);
        } else {
          console.error('Error fetching transactions:', response.statusText);
          setTransactions([]);
        }

      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      loadData();
    }
  }, [currentUser]);

  const handleDeleteHistory = async () => {
    if (!currentUser) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/users/${currentUser.id}/transactions`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        setTransactions([]);
        // toast.success("Historial eliminado correctamente");
      } else {
        console.error("Error eliminando historial:", data.error);
        // toast.error("Error al eliminar el historial");
      }
    } catch (error) {
      console.error("Error de conexión:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-center text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  // Cálculos de saldo - simplificados para evitar errores de parser
  const userAny = currentUser as any;
  const totalCredit = (userAny.credits || 0) / 100;
  const blockedCredit = (userAny.blockedCredits || 0) / 100;
  const availableCredit = totalCredit - blockedCredit;

  // Puntos también se guardan en céntimos (x100)
  const totalPoints = (userAny.points || 0) / 100;
  const blockedPoints = (userAny.blockedPoints || 0) / 100;
  const availablePoints = totalPoints - blockedPoints;

  return (
    <div className="p-3 sm:p-6 max-w-4xl mx-auto mb-20 sm:mb-6 ml-40 sm:ml-52 md:ml-64 mr-8 sm:mr-12 md:mr-16">
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
      </div>

      <div className="mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
          Saldo Bloqueado <span className="text-xs font-normal text-muted-foreground">(Máximo valor por día)</span>
        </h2>

        {blockedBreakdown.length === 0 ? (
          /* Empty state hidden or minimal to avoid clutter if empty? User wants "the same box". 
             If empty, maybe show nothing or keep the "No tienes saldo" message but cleaner. */
          <div className="hidden"></div>
        ) : (
          <ScrollArea className="w-full whitespace-nowrap pb-2">
            <div className="flex gap-3">
              {blockedBreakdown.map((item, index) => {
                const dateObj = new Date(item.date);
                const day = dateObj.getDate();
                const month = format(dateObj, 'MMM', { locale: es }).toUpperCase().replace('.', '');

                return (
                  <div key={index} className="flex flex-col items-center bg-white border border-gray-100 shadow-sm rounded-xl p-2 min-w-[80px]">
                    {/* Month */}
                    <span className="text-[10px] font-bold text-gray-400 uppercase mb-1">
                      {month}
                    </span>

                    {/* Circle Day */}
                    <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center text-lg font-bold shadow-sm mb-1">
                      {day}
                    </div>

                    {/* Amount */}
                    <span className="text-sm font-bold text-slate-800">
                      €{(item.amount / 100).toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        )}
      </div>

      {/* Resumen de saldo */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-border">
          <p className="text-xs font-medium text-muted-foreground mb-1">Saldo Disponible</p>
          <p className="text-2xl font-bold">€{availableCredit.toFixed(2)}</p>
          {/* Blocked credit indicator removed as per user request */}
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-border">
          <p className="text-xs font-medium text-muted-foreground mb-1">Puntos Fidelidad</p>
          <p className="text-2xl font-bold flex items-center gap-1">
            <Trophy className="h-5 w-5 text-yellow-500" />
            {availablePoints.toFixed(2)}
          </p>
          {blockedPoints > 0 && (
            <p className="text-xs text-yellow-600 font-medium mt-1">
              +{blockedPoints.toFixed(2)} bloqueados
            </p>
          )}
        </div>
      </div>

      {/* Botones de acción */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <Button onClick={() => setShowAddCreditDialog(true)} className="w-full gap-2" variant="default">
          <Plus className="h-4 w-4" />
          Recargar Saldo
        </Button>
        <Button onClick={() => setShowConvertBalanceDialog(true)} className="w-full gap-2" variant="outline">
          <Repeat className="h-4 w-4" />
          Canjear Puntos
        </Button>
      </div>

      {/* Historial */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Historial de Movimientos</h2>

          {transactions.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 text-xs px-2"
                  disabled={isDeleting}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Borrar historial
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Borrar historial de movimientos?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción eliminará permanentemente todo tu historial de transacciones.
                    Tu saldo actual NO se verá afectado. Esta acción no se puede deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteHistory}
                    className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                  >
                    {isDeleting ? 'Eliminando...' : 'Sí, eliminar historial'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {loading ? (
          <p className="text-xs text-muted-foreground pl-1">Cargando...</p>
        ) : transactions.length === 0 ? (
          <p className="text-[10px] text-muted-foreground italic pl-1">
            No tienes movimientos registrados.
          </p>
        ) : (
          <div className="space-y-3">
            {transactions.map((txn: any) => {
              const isCredit = txn.transactionType === 'credit';
              const isPositive = txn.amount > 0;

              const description = txn.description || '';
              const lowerDesc = description.toLowerCase();

              const isReservaPista = lowerDesc.includes('reserva de pista');
              const isConfirmada = lowerDesc.includes('confirmada');

              // 🔍 DEFINICIÓN DE TIPO DE MOVIMIENTO
              // Simplificación: Si el texto dice "Inscripción", es inscripción. Si dice "Reserva", es reserva.
              // EXCEPCIÓN: "Reserva de partida" se considera "Inscripción" para el usuario individual.
              const isReservaPartida = lowerDesc.includes('reserva de partida');

              const isInscripcion = lowerDesc.includes('inscripción') || lowerDesc.includes('reserva pendiente') || isReservaPartida;
              const isCancellation = lowerDesc.includes('cancel') || lowerDesc.includes('expirada');
              const isCleanup = txn.action === 'unblock' || txn.action === 'refund';
              const isReserva = lowerDesc.includes('reserva') && !lowerDesc.includes('pendiente') && !isReservaPartida;

              // 🕵️ EXTRAER METADATOS DEL TEXTO (Tipo, Fecha, Hora)
              let type: 'clase' | 'partida' | 'pista' | 'otro' = 'otro';
              if (lowerDesc.includes('clase')) type = 'clase';
              else if (lowerDesc.includes('partida')) type = 'partida';
              else if (lowerDesc.includes('pista')) type = 'pista';

              // Regex para extraer fecha y hora (ej: 13/01/2026, 10:00)
              const dateMatch = description.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
              const timeMatch = description.match(/(\d{1,2}):(\d{2})/);

              let eventDateObj: Date | null = null;
              let dateStr = '';
              let timeStr = '';
              let isPast = false;

              if (dateMatch) {
                const day = parseInt(dateMatch[1]);
                const month = parseInt(dateMatch[2]) - 1; // Meses en JS son 0-11
                const year = parseInt(dateMatch[3]);

                // Intentar obtener hora
                let hour = 0;
                let minute = 0;

                if (timeMatch) {
                  hour = parseInt(timeMatch[1]);
                  minute = parseInt(timeMatch[2]);
                  timeStr = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
                }

                eventDateObj = new Date(year, month, day, hour, minute);

                // Formato legible: "Martes 13 Enero"
                dateStr = format(eventDateObj, "EEEE d MMMM", { locale: es });
                // Capitalizar primera letra
                dateStr = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

                // Verificar si ya pasó
                isPast = eventDateObj < new Date();
              }

              // 🎨 ESTILOS SEGÚN ESTADO (Pasado vs Futuro)
              const isActive = !isPast && !isCancellation && !isCleanup;

              // Contenedor principal
              let containerClass = "bg-gray-50 border-gray-100 opacity-80 grayscale-[0.5]"; // Apagado por defecto

              if (isActive) {
                if (type === 'partida') containerClass = "bg-white border-green-200 shadow-md";
                else if (type === 'pista') containerClass = "bg-white border-orange-200 shadow-md";
                else containerClass = "bg-white border-blue-200 shadow-md"; // Clase o default
              }

              // Badges
              const badgeBase = "px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 border";

              // Textos de reemplazo para descripción
              const shortDescription = txn.description
                .replace(/Reserva pendiente/gi, 'Inscripción')
                .replace(/Reserva de partida/gi, 'Inscripción - Partida')
                .replace(/Clase/g, 'Clase')
                .replace(/Partida/g, 'Partida');

              return (
                <div key={txn.id} className={`border rounded-xl p-3 transition-all ${containerClass}`}>
                  <div className="flex flex-col gap-2">

                    {/* Header: Fecha Transacción */}
                    <div className="flex justify-between items-center">
                      <p className="text-[9px] text-gray-400 capitalize">
                        Reg: {format(new Date(txn.date), "dd/MM/yy HH:mm", { locale: es })}
                      </p>
                    </div>

                    {/* 🏷️ FILA DE ETIQUETAS (Badges) */}
                    <div className="flex flex-wrap gap-2 items-center">

                      {/* 1. Etiqueta INSCRIPCIÓN / RESERVA */}
                      {isInscripcion && (
                        <span className={`${badgeBase} bg-blue-600 text-white border-blue-700 shadow-sm`}>
                          Inscripción
                        </span>
                      )}

                      {isReserva && (
                        <span className={`${badgeBase} bg-emerald-600 text-white border-emerald-700 shadow-sm`}>
                          Reserva
                        </span>
                      )}

                      {/* 2. Etiqueta TIPO (Clase/Partida) */}
                      {type !== 'otro' && (
                        <span className={`${badgeBase} ${isActive
                          ? type === 'clase' ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
                            : type === 'partida' ? 'bg-green-100 text-green-700 border-green-200'
                              : 'bg-orange-100 text-orange-700 border-orange-200' // Pista
                          : 'bg-gray-200 text-gray-600 border-gray-300'}`}>
                          {type === 'clase' && <Award className="w-3 h-3" />}
                          {type === 'partida' && <Trophy className="w-3 h-3" />}
                          {type === 'pista' && <LayoutGrid className="w-3 h-3" />}
                          <span className="capitalize">{type}</span>
                        </span>
                      )}

                      {/* 3. Etiqueta FECHA EVENTO */}
                      {dateStr && (
                        <span className={`${badgeBase} ${isActive ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-white text-gray-500 border-gray-200'}`}>
                          <Calendar className="w-3 h-3" />
                          {dateStr}
                        </span>
                      )}

                      {/* 4. Etiqueta HORA */}
                      {timeStr && (
                        <span className={`${badgeBase} ${isActive ? 'bg-orange-100 text-orange-800 border-orange-300' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                          <Clock className="w-3 h-3" />
                          {timeStr} h
                        </span>
                      )}
                    </div>

                    {/* 💰 SALDOS */}
                    <div className="mt-1 pt-2 border-t border-dashed border-gray-200 flex justify-between items-end">

                      {/* Descripción Corta */}
                      <div className="text-xs text-gray-800 font-semibold line-clamp-1 max-w-[60%]">
                        {shortDescription}
                      </div>

                      {/* Bloque de precios */}
                      <div className="text-right">
                        {/* Monto del movimiento */}
                        <div className={`text-sm font-black ${isPositive ? 'text-green-600' : 'text-gray-900'}`}>
                          {isPositive ? '+' : ''}{txn.amount.toFixed(2)}{isCredit ? '€' : 'pts'}
                        </div>
                        {/* Saldo resultante */}
                        <div className="text-[9px] text-gray-400">
                          Saldo: {txn.balanceAfter.toFixed(2)}{isCredit ? '€' : 'pts'}
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

      {currentUser && (
        <>
          <AddCreditDialog
            isOpen={showAddCreditDialog}
            onOpenChange={setShowAddCreditDialog}
            userId={currentUser.id}
            onCreditAdded={(newBalance) => {
              setCurrentUser(prev => prev ? { ...prev, credit: newBalance } : null);
              window.location.reload();
            }}
          />

          <ConvertBalanceDialog
            isOpen={showConvertBalanceDialog}
            onOpenChange={setShowConvertBalanceDialog}
            currentUser={currentUser}
            onConversionSuccess={(newCredit, newPoints) => {
              setCurrentUser(prev => prev ? { ...prev, credit: newCredit, points: newPoints } : null);
              window.location.reload();
            }}
          />
        </>
      )}
    </div>
  );
};

export default MovimientosPage;
