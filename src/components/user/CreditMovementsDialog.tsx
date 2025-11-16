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
import { Wallet, PlusCircle, MinusCircle, Lock, Activity, Trophy } from 'lucide-react';
import type { User as UserType, Transaction, Booking, MatchBooking } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { getMockTransactions, fetchUserBookings, fetchUserMatchBookings, getMockTimeSlots, getMockMatches } from '@/lib/mockData';
import { cn } from '@/lib/utils';
import { calculatePricePerPerson } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

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
  const [pendingBookings, setPendingBookings] = useState<(Booking | MatchBooking)[]>([]);
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
            
            // Filtrar solo transacciones de créditos (no de puntos)
            const creditTransactions = data.transactions.filter((tx: any) => tx.type === 'credit');
            
            // Mapear transacciones de la DB al formato del componente
            const mappedTransactions: Transaction[] = creditTransactions.map((tx: any) => {
              // Determinar si es entrada (+) o salida (-)
              const isPositive = tx.action === 'add' || tx.action === 'refund' || tx.action === 'unblock';
              const amountInEuros = tx.amount / 100;
              
              return {
                id: tx.id,
                userId: tx.userId,
                type: tx.concept,
                description: tx.concept,
                amount: isPositive ? amountInEuros : -amountInEuros,
                date: tx.createdAt,
                balanceAfter: tx.balance / 100
              };
            });
            
            setTransactions(mappedTransactions);
          } else {
            console.error('Error fetching transactions:', response.statusText);
            setTransactions([]);
          }

          // Cargar bookings pendientes (esto sigue igual)
          const [classBookings, matchBookings] = await Promise.all([
            fetchUserBookings(currentUser.id),
            fetchUserMatchBookings(currentUser.id)
          ]);

          const pendingClassBookings = classBookings.filter(b => b.status === 'pending' && !b.bookedWithPoints);
          const pendingMatchBookings = matchBookings.filter(b => b.matchDetails?.status === 'forming' && !b.bookedWithPoints);

          setPendingBookings([...pendingClassBookings, ...pendingMatchBookings]);

        } catch (error) {
          console.error("Error fetching movements data:", error);
        } finally {
          setLoading(false);
        }
      }
    };
    loadData();
  }, [isOpen, currentUser.id]);

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

        <div className="my-2 p-4 bg-secondary rounded-lg shadow-inner space-y-3">
            {/* Fila superior: Saldo Disponible y Total */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <p className="text-sm text-secondary-foreground">Saldo Disponible:</p>
                    <p className="text-3xl font-bold text-primary">{availableCredit.toFixed(2)}€</p>
                </div>
                <div>
                    <p className="text-sm text-secondary-foreground">Saldo Total:</p>
                    <p className="text-xl font-semibold text-muted-foreground">{totalCredit.toFixed(2)}€</p>
                </div>
            </div>
            
            {/* Fila inferior: Saldo Bloqueado (solo si hay algo bloqueado) */}
            {blockedCredit > 0 && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Lock className="h-4 w-4 text-orange-600" />
                            <span className="text-sm font-medium text-orange-900">Saldo Bloqueado:</span>
                        </div>
                        <span className="text-lg font-bold text-orange-700">{blockedCredit.toFixed(2)}€</span>
                    </div>
                    <p className="text-xs text-orange-600 mt-1">
                        Este monto está reservado por reservas pendientes de confirmar
                    </p>
                </div>
            )}
        </div>

        <ScrollArea className="h-[400px] my-2 pr-3 space-y-4">
            {/* Blocked Credit Section */}
            <div>
                <h4 className="font-semibold text-base text-foreground mb-2 flex items-center">
                    <Lock className="mr-2 h-5 w-5" />
                    Saldo Bloqueado ({blockedCredit.toFixed(2)}€)
                </h4>
                {loading ? (
                    <p className="text-base text-muted-foreground">Cargando...</p>
                ) : pendingBookings.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic p-3 bg-muted/50 rounded-md">No tienes saldo bloqueado por pre-inscripciones.</p>
                ) : (
                    <div className="space-y-3">
                        {pendingBookings.map(booking => {
                             let details = { type: '', description: '', amount: 0 };
                             if (booking.activityType === 'class') {
                                 details = {
                                     type: 'Clase',
                                     description: `con ${booking.slotDetails?.instructorName} el ${format(new Date(booking.slotDetails!.startTime), "dd/MM")}`,
                                     amount: calculatePricePerPerson(booking.slotDetails?.totalPrice, booking.groupSize)
                                 };
                             } else { // Match
                                 details = {
                                     type: 'Partida',
                                     description: `Nivel ${booking.matchDetails?.level} el ${format(new Date(booking.matchDetails!.startTime), "dd/MM")}`,
                                     amount: calculatePricePerPerson(booking.matchDetails?.totalCourtFee, 4)
                                 };
                             }
                            return (
                                <div key={booking.id} className="flex items-center justify-between p-3 rounded-md border bg-background/50">
                                    <div className="flex-grow">
                                        <p className="font-semibold text-sm flex items-center">
                                            {booking.activityType === 'class' ? <Activity className="h-4 w-4 mr-1.5"/> : <Trophy className="h-4 w-4 mr-1.5"/>}
                                            {details.type}
                                        </p>
                                        <p className="text-muted-foreground text-sm">{details.description}</p>
                                    </div>
                                    <div className="font-bold text-base text-muted-foreground">
                                        -{details.amount.toFixed(2)}€
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <Separator className="my-4" />

            {/* Transaction History Section */}
             <div>
                <h4 className="font-semibold text-base text-foreground mb-2">Historial de Movimientos</h4>
                 {loading ? (
                    <p className="text-base text-muted-foreground">Cargando...</p>
                ) : transactions.length === 0 ? (
                     <p className="text-sm text-muted-foreground italic p-3 bg-muted/50 rounded-md">No tienes movimientos de saldo registrados.</p>
                ) : (
                    <div className="space-y-3">
                        {transactions.map((txn) => (
                            <div key={txn.id} className="flex items-start justify-between p-3 rounded-md border bg-background/50">
                                <div className="flex-grow">
                                    <p className="font-semibold text-base">{txn.type}</p>
                                    <p className="text-muted-foreground text-sm">{txn.description}</p>
                                    <p className="text-muted-foreground/80 text-xs mt-1.5">{format(new Date(txn.date), "dd MMM yyyy, HH:mm", { locale: es })}</p>
                                </div>
                                <div className={cn(
                                    "flex items-center font-bold text-lg",
                                    txn.amount > 0 ? 'text-green-600' : 'text-destructive'
                                )}>
                                    {txn.amount > 0 ? <PlusCircle className="h-5 w-5 mr-1.5"/> : <MinusCircle className="h-5 w-5 mr-1.5"/>}
                                    {Math.abs(txn.amount).toFixed(2)}€
                                </div>
                            </div>
                        ))}
                    </div>
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
