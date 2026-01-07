"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BookingCard from './BookingCard';
import MatchGameCard from '@/components/match/MatchGameCard';
import CourtReservationCard from './CourtReservationCard';
import { Loader2 } from 'lucide-react';
import type { User, TimeSlot } from '@/types';
import { useToast } from '@/hooks/use-toast';

interface UserBookingsProps {
  currentUser: User;
  onBookingActionSuccess?: () => void;
}

interface BookingWithTimeSlot {
  id: string;
  userId: string;
  groupSize: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  user: {
    name: string;
    email: string;
    profilePictureUrl?: string;
  };
  timeSlot: {
    id: string;
    start: string;
    end: string;
    level: string;
    category: string;
    totalPrice: number;
    maxPlayers: number;
    totalPlayers: number;
    instructor: {
      id: string;
      name: string;
      profilePictureUrl?: string;
    };
    instructorId: string;
    instructorName: string;
    instructorProfilePicture?: string;
    court: {
      number: number;
    } | null;
    courtId?: string | null;
    courtNumber?: number | null;
    genderCategory: string | null;
    creditsSlots?: number[];
    bookings?: any[];
  };
}

const UserBookings: React.FC<UserBookingsProps> = ({ currentUser, onBookingActionSuccess }) => {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') as 'confirmed' | 'pending' | 'past' | 'cancelled' | null;
  
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'confirmed' | 'pending' | 'past' | 'cancelled'>(tabParam || 'pending');
  const { toast } = useToast();

  // Actualizar pestaña si cambia el parámetro URL
  useEffect(() => {
    if (tabParam && ['confirmed', 'pending', 'past', 'cancelled'].includes(tabParam)) {
      setActiveFilter(tabParam);
    }
  }, [tabParam]);

  // Callback memoizado para onBookingSuccess
  const handleBookingSuccess = useCallback(() => {
    loadBookings();
    if (onBookingActionSuccess) {
      onBookingActionSuccess();
    }
  }, [onBookingActionSuccess]); // loadBookings es estable por useCallback

  // Cargar reservas del usuario - Memoizada con useCallback
  const loadBookings = useCallback(async () => {
    if (!currentUser?.id) {
      console.warn('⚠️ No se puede cargar bookings: currentUser.id no existe');
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    try {
      console.log('📚 Cargando bookings para usuario:', currentUser.id);
      
      // Cargar CLASES
      const classResponse = await fetch(`/api/users/${currentUser.id}/bookings`);
      let classBookings: any[] = [];
      if (classResponse.ok) {
        classBookings = await classResponse.json();
        console.log(`✅ Cargadas ${classBookings.length} reservas de clases`);
      }
      
      // Cargar PARTIDAS
      const matchResponse = await fetch(`/api/users/${currentUser.id}/match-bookings`);
      let matchBookings: any[] = [];
      if (matchResponse.ok) {
        matchBookings = await matchResponse.json();
        console.log(`✅ Cargadas ${matchBookings.length} reservas de partidas`);
      }
      
      // Cargar RESERVAS DE PISTAS
      const courtResponse = await fetch(`/api/users/${currentUser.id}/court-reservations`);
      let courtReservations: any[] = [];
      if (courtResponse.ok) {
        courtReservations = await courtResponse.json();
        console.log(`✅ Cargadas ${courtReservations.length} reservas de pistas`);
      }
      
      // Combinar todos los tipos de bookings
      const allBookings = [...classBookings, ...matchBookings, ...courtReservations];
      setBookings(allBookings);
      console.log(`✅ Total de reservas cargadas: ${allBookings.length} (${classBookings.length} clases + ${matchBookings.length} partidas + ${courtReservations.length} pistas)`);
      
    } catch (error) {
      console.error('❌ Error al cargar reservas:', error);
      setBookings([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.id]);

  // Función para cancelar booking
  const handleCancelBooking = async (bookingId: string) => {
    try {
      const url = `/api/admin/bookings/${bookingId}`;
      console.log('📞 Cancelando booking:', url);
      
      const response = await fetch(url, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        toast({
          title: "¡Reserva cancelada!",
          description: "Tu reserva ha sido cancelada exitosamente",
          className: "bg-orange-600 text-white"
        });
        
        // Recargar bookings
        await loadBookings();
        
        // Notificar al padre para que actualice el calendario
        if (onBookingActionSuccess) {
          onBookingActionSuccess();
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast({
          title: "Error al cancelar",
          description: errorData.error || 'No se pudo cancelar la reserva',
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error canceling booking:', error);
      toast({
        title: "Error de conexión",
        description: 'No se pudo conectar con el servidor',
        variant: "destructive"
      });
    }
  };

  // Función para cancelar reserva de pista
  const handleCancelCourtReservation = async (reservationId: string) => {
    try {
      console.log('📞 Cancelando reserva de pista:', reservationId);
      
      const response = await fetch(`/api/bookings/court-reservation/${reservationId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        toast({
          title: "¡Reserva cancelada!",
          description: "Tu reserva de pista ha sido cancelada exitosamente",
          className: "bg-orange-600 text-white"
        });
        
        // Recargar bookings
        await loadBookings();
        
        // Notificar al padre para que actualice el calendario
        if (onBookingActionSuccess) {
          onBookingActionSuccess();
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast({
          title: "Error al cancelar",
          description: errorData.error || 'No se pudo cancelar la reserva',
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error canceling court reservation:', error);
      toast({
        title: "Error de conexión",
        description: 'No se pudo conectar con el servidor',
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (currentUser?.id) {
      console.log('🔄 useEffect triggered - Loading bookings for:', currentUser.id);
      
      // Timeout de seguridad: si loadBookings tarda más de 10 segundos, mostrar error
      const timeoutId = setTimeout(() => {
        console.error('⏰ TIMEOUT: loadBookings tardó más de 10 segundos');
        setIsLoading(false);
      }, 10000);
      
      loadBookings().finally(() => {
        clearTimeout(timeoutId);
      });
      
      return () => {
        clearTimeout(timeoutId);
      };
    } else {
      console.warn('⚠️ useEffect: currentUser.id no existe');
      setIsLoading(false);
    }
  }, [currentUser?.id]);

  // Memoizar filtrado para evitar recalcular en cada render
  const filteredBookings = useMemo(() => {
    const now = new Date();
    
    console.log(`🔎 Filtrando bookings - Filtro activo: ${activeFilter}, Total bookings: ${bookings.length}`);
    
    switch (activeFilter) {
      case 'confirmed':
        return bookings.filter(b => {
          // Detectar tipo de reserva
          const isClassBooking = !!b.timeSlot;
          const isMatchBooking = !!b.matchGame;
          const isCourtReservation = b.type === 'court-reservation';
          
          if (isClassBooking) {
            const hasCourtAssigned = b.timeSlot.court !== null || b.timeSlot.courtId !== null || b.timeSlot.courtNumber !== null;
            const isFuture = new Date(b.timeSlot.start) >= now;
            const isNotCancelled = b.status !== 'CANCELLED';
            return hasCourtAssigned && isFuture && isNotCancelled;
          } else if (isMatchBooking) {
            const hasCourtAssigned = b.matchGame.courtId !== null || b.matchGame.courtNumber !== null;
            const isFuture = new Date(b.matchGame.start) >= now;
            const isNotCancelled = b.status !== 'CANCELLED';
            return hasCourtAssigned && isFuture && isNotCancelled;
          } else if (isCourtReservation) {
            const isFuture = new Date(b.end) >= now;
            const isNotCancelled = b.status !== 'CANCELLED';
            return isFuture && isNotCancelled;
          }
          return false;
        });
      
      case 'pending':
        return bookings.filter(b => {
          const isClassBooking = !!b.timeSlot;
          const isMatchBooking = !!b.matchGame;
          
          if (isClassBooking) {
            const noCourtAssigned = b.timeSlot.court === null && (b.timeSlot.courtId === null || b.timeSlot.courtId === undefined) && (b.timeSlot.courtNumber === null || b.timeSlot.courtNumber === undefined);
            const isFuture = new Date(b.timeSlot.start) >= now;
            const isNotCancelled = b.status !== 'CANCELLED';
            return noCourtAssigned && isFuture && isNotCancelled;
          } else if (isMatchBooking) {
            const noCourtAssigned = (b.matchGame.courtId === null || b.matchGame.courtId === undefined) && (b.matchGame.courtNumber === null || b.matchGame.courtNumber === undefined);
            const isFuture = new Date(b.matchGame.start) >= now;
            const isNotCancelled = b.status !== 'CANCELLED';
            return noCourtAssigned && isFuture && isNotCancelled;
          }
          return false;
        });
      
      case 'past':
        return bookings.filter(b => {
          const isClassBooking = !!b.timeSlot;
          const isMatchBooking = !!b.matchGame;
          const isCourtReservation = b.type === 'court-reservation';
          
          if (isClassBooking) {
            const isPast = new Date(b.timeSlot.start) < now;
            const isNotCancelled = b.status !== 'CANCELLED';
            return isPast && isNotCancelled;
          } else if (isMatchBooking) {
            const isPast = new Date(b.matchGame.start) < now;
            const isNotCancelled = b.status !== 'CANCELLED';
            return isPast && isNotCancelled;
          } else if (isCourtReservation) {
            const isPast = new Date(b.end) < now;
            const isNotCancelled = b.status !== 'CANCELLED';
            return isPast && isNotCancelled;
          }
          return false;
        });
      
      case 'cancelled':
        return bookings.filter(b => {
          const isCancelled = b.status === 'CANCELLED';
          const wasConfirmed = (b as any).wasConfirmed === true; // Solo las que fueron confirmadas
          return isCancelled && wasConfirmed;
        });
      
      default:
        return bookings;
    }
  }, [bookings, activeFilter]);

  console.log(`📊 Bookings filtrados: ${filteredBookings.length} (clases: ${filteredBookings.filter(b => !!b.timeSlot).length}, partidas: ${filteredBookings.filter(b => !!b.matchGame).length}, pistas: ${filteredBookings.filter(b => b.type === 'court-reservation').length})`);

  // Memoizar contadores para evitar recalcular en cada render
  const counts = useMemo(() => {
    const now = new Date();
    return {
      confirmed: bookings.filter(b => {
        const isClassBooking = !!b.timeSlot;
        const isMatchBooking = !!b.matchGame;
        const isCourtReservation = b.type === 'court-reservation';
        
        if (isClassBooking) {
          const hasCourtAssigned = b.timeSlot.court !== null || b.timeSlot.courtId !== null || b.timeSlot.courtNumber !== null;
          const isFuture = new Date(b.timeSlot.start) >= now;
          const isNotCancelled = b.status !== 'CANCELLED';
          return hasCourtAssigned && isFuture && isNotCancelled;
        } else if (isMatchBooking) {
          const hasCourtAssigned = b.matchGame.courtId !== null || b.matchGame.courtNumber !== null;
          const isFuture = new Date(b.matchGame.start) >= now;
          const isNotCancelled = b.status !== 'CANCELLED';
          return hasCourtAssigned && isFuture && isNotCancelled;
        } else if (isCourtReservation) {
          const isFuture = new Date(b.end) >= now;
          const isNotCancelled = b.status !== 'CANCELLED';
          return isFuture && isNotCancelled;
        }
        return false;
      }).length,
      pending: bookings.filter(b => {
        const isClassBooking = !!b.timeSlot;
        const isMatchBooking = !!b.matchGame;
        
        if (isClassBooking) {
          const noCourtAssigned = b.timeSlot.court === null && (b.timeSlot.courtId === null || b.timeSlot.courtId === undefined) && (b.timeSlot.courtNumber === null || b.timeSlot.courtNumber === undefined);
          const isFuture = new Date(b.timeSlot.start) >= now;
          const isNotCancelled = b.status !== 'CANCELLED';
          return noCourtAssigned && isFuture && isNotCancelled;
        } else if (isMatchBooking) {
          const noCourtAssigned = (b.matchGame.courtId === null || b.matchGame.courtId === undefined) && (b.matchGame.courtNumber === null || b.matchGame.courtNumber === undefined);
          const isFuture = new Date(b.matchGame.start) >= now;
          const isNotCancelled = b.status !== 'CANCELLED';
          return noCourtAssigned && isFuture && isNotCancelled;
        }
        return false;
      }).length,
      past: bookings.filter(b => {
        const isClassBooking = !!b.timeSlot;
        const isMatchBooking = !!b.matchGame;
        const isCourtReservation = b.type === 'court-reservation';
        
        if (isClassBooking) {
          const isPast = new Date(b.timeSlot.start) < now;
          const isNotCancelled = b.status !== 'CANCELLED';
          return isPast && isNotCancelled;
        } else if (isMatchBooking) {
          const isPast = new Date(b.matchGame.start) < now;
          const isNotCancelled = b.status !== 'CANCELLED';
          return isPast && isNotCancelled;
        } else if (isCourtReservation) {
          const isPast = new Date(b.end) < now;
          const isNotCancelled = b.status !== 'CANCELLED';
          return isPast && isNotCancelled;
        }
        return false;
      }).length,
      cancelled: bookings.filter(b => {
        const isCancelled = b.status === 'CANCELLED';
        const wasConfirmed = (b as any).wasConfirmed === true;
        return isCancelled && wasConfirmed;
      }).length,
    };
  }, [bookings]);

  // Calcular saldos bloqueados por fecha (inscripciones pendientes)
  // ⚠️ REGLA: Solo se bloquea el precio MÁS ALTO del día, porque solo puede tener 1 reserva confirmada por día
  const blockedBalances = useMemo(() => {
    const now = new Date();
    const pendingBookings = bookings.filter(b => {
      const isClassBooking = !!b.timeSlot;
      const isMatchBooking = !!b.matchGame;
      
      if (isClassBooking) {
        const noCourtAssigned = b.timeSlot.court === null && 
          (b.timeSlot.courtId === null || b.timeSlot.courtId === undefined) && 
          (b.timeSlot.courtNumber === null || b.timeSlot.courtNumber === undefined);
        const isFuture = new Date(b.timeSlot.start) >= now;
        const isNotCancelled = b.status !== 'CANCELLED';
        return noCourtAssigned && isFuture && isNotCancelled;
      } else if (isMatchBooking) {
        const noCourtAssigned = (b.matchGame.courtId === null || b.matchGame.courtId === undefined) && 
          (b.matchGame.courtNumber === null || b.matchGame.courtNumber === undefined);
        const isFuture = new Date(b.matchGame.start) >= now;
        const isNotCancelled = b.status !== 'CANCELLED';
        return noCourtAssigned && isFuture && isNotCancelled;
      }
      return false;
    });

    // Agrupar por fecha y encontrar el precio MÁS ALTO de cada día
    const balancesByDate: { [date: string]: { date: Date, amount: number } } = {};
    
    pendingBookings.forEach(booking => {
      const isClassBooking = !!booking.timeSlot;
      const isMatchBooking = !!booking.matchGame;
      
      let startDate: Date;
      let blockedAmount: number;
      
      if (isClassBooking) {
        startDate = new Date(booking.timeSlot.start);
        // ✅ Fórmula correcta: totalPrice dividido entre groupSize
        blockedAmount = booking.timeSlot.totalPrice / booking.groupSize;
      } else if (isMatchBooking) {
        startDate = new Date(booking.matchGame.start);
        // Para partidas: courtRentalPrice / 4 (o usar pricePerPlayer)
        blockedAmount = booking.matchGame.pricePerPlayer || (booking.matchGame.courtRentalPrice / 4);
      } else {
        return;
      }
      
      const dateKey = startDate.toISOString().split('T')[0]; // YYYY-MM-DD
      
      if (!balancesByDate[dateKey]) {
        balancesByDate[dateKey] = { date: startDate, amount: blockedAmount };
      } else {
        // 🎯 SOLO mantener el monto MÁS ALTO del día (no sumar)
        balancesByDate[dateKey].amount = Math.max(balancesByDate[dateKey].amount, blockedAmount);
      }
    });

    // Convertir a array y ordenar por fecha
    return Object.values(balancesByDate).sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [bookings]);

  // Calcular pagos realizados por fecha (reservas confirmadas)
  const paidAmounts = useMemo(() => {
    const now = new Date();
    const confirmedBookings = bookings.filter(b => {
      const isClassBooking = !!b.timeSlot;
      const isMatchBooking = !!b.matchGame;
      
      if (isClassBooking) {
        const hasCourtAssigned = b.timeSlot.court !== null || b.timeSlot.courtId !== null || b.timeSlot.courtNumber !== null;
        const isFuture = new Date(b.timeSlot.start) >= now;
        const isNotCancelled = b.status !== 'CANCELLED';
        return hasCourtAssigned && isFuture && isNotCancelled;
      } else if (isMatchBooking) {
        const hasCourtAssigned = b.matchGame.courtId !== null || b.matchGame.courtNumber !== null;
        const isFuture = new Date(b.matchGame.start) >= now;
        const isNotCancelled = b.status !== 'CANCELLED';
        return hasCourtAssigned && isFuture && isNotCancelled;
      }
      return false;
    });

    // Agrupar por fecha y calcular monto pagado
    const amountsByDate: { [date: string]: { date: Date, amount: number } } = {};
    
    confirmedBookings.forEach(booking => {
      const isClassBooking = !!booking.timeSlot;
      const isMatchBooking = !!booking.matchGame;
      
      let startDate: Date;
      let paidAmount: number;
      
      if (isClassBooking) {
        startDate = new Date(booking.timeSlot.start);
        paidAmount = booking.timeSlot.totalPrice / booking.groupSize;
      } else if (isMatchBooking) {
        startDate = new Date(booking.matchGame.start);
        paidAmount = booking.matchGame.pricePerPlayer || (booking.matchGame.courtRentalPrice / 4);
      } else {
        return;
      }
      
      const dateKey = startDate.toISOString().split('T')[0]; // YYYY-MM-DD
      
      if (!amountsByDate[dateKey]) {
        amountsByDate[dateKey] = { date: startDate, amount: paidAmount };
      } else {
        // Para reservas confirmadas, sumar todos los pagos del día
        amountsByDate[dateKey].amount += paidAmount;
      }
    });

    // Convertir a array y ordenar por fecha
    return Object.values(amountsByDate).sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [bookings]);

  // Calcular puntos retornados por fecha (reservas canceladas)
  const refundedPoints = useMemo(() => {
    const cancelledBookings = bookings.filter(b => {
      const isCancelled = b.status === 'CANCELLED';
      const wasConfirmed = (b as any).wasConfirmed === true;
      return isCancelled && wasConfirmed;
    });

    // Agrupar por fecha y sumar puntos retornados
    const pointsByDate: { [date: string]: { date: Date, amount: number } } = {};
    
    cancelledBookings.forEach(booking => {
      // Detectar tipo de booking
      const isClassBooking = !!(booking as any).timeSlot;
      const isMatchBooking = !!(booking as any).matchGame;
      
      if (!isClassBooking && !isMatchBooking) return;
      
      const startDate = isClassBooking 
        ? new Date((booking as any).timeSlot.start)
        : new Date((booking as any).matchGame.start);
      const dateKey = startDate.toISOString().split('T')[0]; // YYYY-MM-DD
      
      // Calcular puntos retornados por esta cancelación
      const totalPrice = isClassBooking
        ? (booking as any).timeSlot.totalPrice
        : (booking as any).matchGame.pricePerPlayer;
      const groupSize = (booking as any).groupSize || 1;
      const refundedAmount = totalPrice / groupSize;
      
      if (!pointsByDate[dateKey]) {
        pointsByDate[dateKey] = { date: startDate, amount: refundedAmount };
      } else {
        // Sumar todos los puntos retornados del mismo día
        pointsByDate[dateKey].amount += refundedAmount;
      }
    });

    // Convertir a array y ordenar por fecha
    return Object.values(pointsByDate).sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [bookings]);

  // Calcular saldo desbloqueado por caducidad (inscripciones expiradas)
  const expiredBalances = useMemo(() => {
    const now = new Date();
    const expiredBookings = bookings.filter(b => {
      const isClassBooking = !!b.timeSlot;
      const isMatchBooking = !!b.matchGame;
      
      if (isClassBooking) {
        const noCourtAssigned = b.timeSlot.court === null && 
          (b.timeSlot.courtId === null || b.timeSlot.courtId === undefined) && 
          (b.timeSlot.courtNumber === null || b.timeSlot.courtNumber === undefined);
        const isPast = new Date(b.timeSlot.start) < now;
        const isNotCancelled = b.status !== 'CANCELLED';
        return noCourtAssigned && isPast && isNotCancelled;
      } else if (isMatchBooking) {
        const noCourtAssigned = (b.matchGame.courtId === null || b.matchGame.courtId === undefined) && 
          (b.matchGame.courtNumber === null || b.matchGame.courtNumber === undefined);
        const isPast = new Date(b.matchGame.start) < now;
        const isNotCancelled = b.status !== 'CANCELLED';
        return noCourtAssigned && isPast && isNotCancelled;
      }
      return false;
    });

    console.log('🔍 Inscripciones expiradas encontradas:', expiredBookings.length);
    if (expiredBookings.length > 0) {
      console.log('📋 Detalles:', expiredBookings.map(b => {
        const isClassBooking = !!b.timeSlot;
        const isMatchBooking = !!b.matchGame;
        if (isClassBooking) {
          return {
            tipo: 'clase',
            fecha: new Date(b.timeSlot.start).toLocaleString('es-ES'),
            precio: b.timeSlot.totalPrice,
            groupSize: b.groupSize,
            calculado: b.timeSlot.totalPrice / b.groupSize
          };
        } else if (isMatchBooking) {
          return {
            tipo: 'partida',
            fecha: new Date(b.matchGame.start).toLocaleString('es-ES'),
            precio: b.matchGame.pricePerPlayer || (b.matchGame.courtRentalPrice / 4)
          };
        }
        return null;
      }).filter(Boolean));
    }

    // Agrupar por fecha y sumar saldos desbloqueados
    const balancesByDate: { [date: string]: { date: Date, amount: number } } = {};
    
    expiredBookings.forEach(booking => {
      const isClassBooking = !!booking.timeSlot;
      const isMatchBooking = !!booking.matchGame;
      
      let startDate: Date;
      let unlockedAmount: number;
      
      if (isClassBooking) {
        startDate = new Date(booking.timeSlot.start);
        unlockedAmount = booking.timeSlot.totalPrice / booking.groupSize;
      } else if (isMatchBooking) {
        startDate = new Date(booking.matchGame.start);
        unlockedAmount = booking.matchGame.pricePerPlayer || (booking.matchGame.courtRentalPrice / 4);
      } else {
        return;
      }
      
      const dateKey = startDate.toISOString().split('T')[0]; // YYYY-MM-DD
      
      if (!balancesByDate[dateKey]) {
        balancesByDate[dateKey] = { date: startDate, amount: unlockedAmount };
      } else {
        // Sumar todos los saldos desbloqueados del mismo día
        balancesByDate[dateKey].amount += unlockedAmount;
      }
    });

    // Convertir a array y ordenar por fecha
    const result = Object.values(balancesByDate).sort((a, b) => a.date.getTime() - b.date.getTime());
    console.log('💰 Saldos desbloqueados por fecha:', result);
    return result;
  }, [bookings]);

  return (
    <Card className="shadow-lg border-gray-200 relative z-0 max-w-full overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 border-b border-gray-200">
         {/* No incluir título ni subtítulo principal aquí, ya que se muestran en agenda/page.tsx */}
      </CardHeader>
      <CardContent className="pt-6">
        {/* Tabs de filtrado */}
        <Tabs value={activeFilter} onValueChange={(value) => setActiveFilter(value as any)} className="w-full max-w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8 h-auto p-1.5 sm:p-2 bg-gradient-to-r from-slate-100 to-slate-200 rounded-xl gap-2 shadow-inner">
            {/* Inscripciones - Azul como botón I */}
            <TabsTrigger 
              value="pending" 
              style={{
                backgroundColor: activeFilter === 'pending' ? '#3b82f6' : undefined,
                color: activeFilter === 'pending' ? 'white' : undefined
              }}
              className={`text-xs sm:text-sm lg:text-base font-bold py-3 px-2 sm:py-4 sm:px-4 shadow-lg transition-all flex flex-col sm:flex-row items-center justify-center gap-1 rounded-lg ${
                activeFilter === 'pending' 
                  ? 'scale-105' 
                  : 'bg-white/50 hover:bg-white/80'
              }`}
            >
              <span className="flex items-center gap-1">
                <span className="text-lg">⏳</span>
                <span className="whitespace-nowrap">Inscr.</span>
              </span>
              <span className="hidden sm:inline">ipciones</span>
              <span 
                style={{
                  backgroundColor: activeFilter === 'pending' ? 'white' : undefined,
                  color: activeFilter === 'pending' ? '#3b82f6' : undefined
                }}
                className={`px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-black shadow-md ${
                  activeFilter === 'pending'
                    ? ''
                    : 'bg-gradient-to-r from-yellow-400 to-orange-400 text-white'
                }`}>
                {counts.pending}
              </span>
            </TabsTrigger>
            
            {/* Reservas - Rojo como botón R */}
            <TabsTrigger 
              value="confirmed" 
              style={{
                backgroundColor: activeFilter === 'confirmed' ? '#ef4444' : undefined,
                color: activeFilter === 'confirmed' ? 'white' : undefined
              }}
              className={`text-xs sm:text-sm lg:text-base font-bold py-3 px-2 sm:py-4 sm:px-4 shadow-lg transition-all flex flex-col sm:flex-row items-center justify-center gap-1 rounded-lg ${
                activeFilter === 'confirmed' 
                  ? 'scale-105' 
                  : 'bg-white/50 hover:bg-white/80'
              }`}
            >
              <span className="flex items-center gap-1">
                <span className="text-lg">✅</span>
                <span className="whitespace-nowrap">Reservas</span>
              </span>
              <span 
                style={{
                  backgroundColor: activeFilter === 'confirmed' ? 'white' : undefined,
                  color: activeFilter === 'confirmed' ? '#ef4444' : undefined
                }}
                className={`px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-black shadow-md ${
                  activeFilter === 'confirmed'
                    ? ''
                    : 'bg-gradient-to-r from-green-400 to-emerald-500 text-white'
                }`}>
                {counts.confirmed}
              </span>
            </TabsTrigger>
            
            {/* Pasadas - Gris y Blanca */}
            <TabsTrigger 
              value="past" 
              style={{
                backgroundColor: activeFilter === 'past' ? '#6b7280' : undefined,
                color: activeFilter === 'past' ? 'white' : undefined
              }}
              className={`text-xs sm:text-sm lg:text-base font-bold py-3 px-2 sm:py-4 sm:px-4 shadow-lg transition-all flex flex-col sm:flex-row items-center justify-center gap-1 rounded-lg ${
                activeFilter === 'past' 
                  ? 'scale-105' 
                  : 'bg-white/50 hover:bg-white/80'
              }`}
            >
              <span className="flex items-center gap-1">
                <span className="text-lg">📜</span>
                <span className="whitespace-nowrap">Pas.</span>
              </span>
              <span className="hidden sm:inline">adas</span>
              <span 
                style={{
                  backgroundColor: activeFilter === 'past' ? 'white' : undefined,
                  color: activeFilter === 'past' ? '#6b7280' : undefined
                }}
                className={`px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-black shadow-md ${
                  activeFilter === 'past'
                    ? ''
                    : 'bg-gradient-to-r from-gray-400 to-gray-500 text-white'
                }`}>
                {counts.past}
              </span>
            </TabsTrigger>
            
            {/* Canceladas - Naranja y Blanca */}
            <TabsTrigger 
              value="cancelled" 
              style={{
                backgroundColor: activeFilter === 'cancelled' ? '#f97316' : undefined,
                color: activeFilter === 'cancelled' ? 'white' : undefined
              }}
              className={`text-xs sm:text-sm lg:text-base font-bold py-3 px-2 sm:py-4 sm:px-4 shadow-lg transition-all flex flex-col sm:flex-row items-center justify-center gap-1 rounded-lg ${
                activeFilter === 'cancelled' 
                  ? 'scale-105' 
                  : 'bg-white/50 hover:bg-white/80'
              }`}
            >
              <span className="flex items-center gap-1">
                <span className="text-lg">❌</span>
                <span className="whitespace-nowrap">Canc.</span>
              </span>
              <span className="hidden sm:inline">eladas</span>
              <span 
                style={{
                  backgroundColor: activeFilter === 'cancelled' ? 'white' : undefined,
                  color: activeFilter === 'cancelled' ? '#f97316' : undefined
                }}
                className={`px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-black shadow-md ${
                  activeFilter === 'cancelled'
                    ? ''
                    : 'bg-gradient-to-r from-red-500 to-red-600 text-white'
                }`}>
                {counts.cancelled}
              </span>
            </TabsTrigger>
          </TabsList>

          {/* Botón para ver saldo de movimientos */}
          <div className="mb-4 flex justify-end">
            <button
              className="px-4 py-2 bg-gray-800 text-white rounded-lg shadow hover:bg-gray-700 transition-colors font-semibold text-sm"
              onClick={() => {
                window.location.href = '/movimientos';
              }}
            >
              Ver saldo de movimientos
            </button>
          </div>

          {/* Contador de Saldo Bloqueado - Solo en Inscripciones */}
          {activeFilter === 'pending' && blockedBalances.length > 0 && (
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg font-semibold text-gray-700">Saldo Bloqueado</span>
              </div>
              <div className="flex flex-wrap gap-3">
                {blockedBalances.map((balance, index) => {
                  const day = balance.date.getDate();
                  const month = balance.date.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '');
                  
                  return (
                    <div 
                      key={index}
                      className="flex flex-col items-center bg-white rounded-xl shadow-md p-3 border-2 border-gray-200 min-w-[100px]"
                    >
                      <div className="text-xs text-gray-500 font-medium uppercase mb-1">
                        {month}
                      </div>
                      <div className="flex items-center justify-center w-14 h-14 rounded-full bg-blue-500 text-white text-2xl font-bold mb-2">
                        {day}
                      </div>
                      <div className="text-lg font-bold text-gray-900">
                        {balance.amount.toFixed(2)}€
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Contador de Pagos Realizados - Solo en Reservas */}
          {activeFilter === 'confirmed' && paidAmounts.length > 0 && (
            <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg font-semibold text-gray-700">Pagos Realizados</span>
              </div>
              <div className="flex flex-wrap gap-3">
                {paidAmounts.map((payment, index) => {
                  const day = payment.date.getDate();
                  const month = payment.date.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '');
                  
                  return (
                    <div 
                      key={index}
                      className="flex flex-col items-center bg-white rounded-xl shadow-md p-3 border-2 border-gray-200 min-w-[100px]"
                    >
                      <div className="text-xs text-gray-500 font-medium uppercase mb-1">
                        {month}
                      </div>
                      <div className="flex items-center justify-center w-14 h-14 rounded-full bg-green-500 text-white text-2xl font-bold mb-2">
                        {day}
                      </div>
                      <div className="text-lg font-bold text-gray-900">
                        {payment.amount.toFixed(2)}€
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Contador de Puntos Retornados - Solo en Canceladas */}
          {activeFilter === 'cancelled' && refundedPoints.length > 0 && (
            <div className="mb-6 p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl border border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg font-semibold text-gray-700">Puntos Retornados</span>
              </div>
              <div className="flex flex-wrap gap-3">
                {refundedPoints.map((refund, index) => {
                  const day = refund.date.getDate();
                  const month = refund.date.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '');
                  
                  return (
                    <div 
                      key={index}
                      className="flex flex-col items-center bg-white rounded-xl shadow-md p-3 border-2 border-gray-200 min-w-[100px]"
                    >
                      <div className="text-xs text-gray-500 font-medium uppercase mb-1">
                        {month}
                      </div>
                      <div className="flex items-center justify-center w-14 h-14 rounded-full bg-orange-500 text-white text-2xl font-bold mb-2">
                        {day}
                      </div>
                      <div className="text-lg font-bold text-gray-900">
                        {refund.amount.toFixed(2)} pts
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Contador de Saldo Desbloqueado - Siempre visible en Pasadas */}
          {activeFilter === 'past' && (
            <div className="mb-6 p-4 bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl border border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg font-semibold text-gray-700">Saldo Desbloqueado</span>
                <span className="text-sm text-gray-500">(Clases incompletas expiradas)</span>
              </div>
              <div className="flex flex-wrap gap-3">
                {expiredBalances.length === 0 ? (
                  <div className="flex flex-col items-center bg-white rounded-xl shadow-md p-3 border-2 border-gray-200 min-w-[100px]">
                    <div className="text-xs text-gray-500 font-medium uppercase mb-1">-</div>
                    <div className="flex items-center justify-center w-14 h-14 rounded-full bg-gray-400 text-white text-2xl font-bold mb-2">0</div>
                    <div className="text-lg font-bold text-gray-900">0.00 pts</div>
                  </div>
                ) : (
                  expiredBalances.map((expired, index) => {
                    const day = expired.date.getDate();
                    const month = expired.date.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '');
                    return (
                      <div 
                        key={index}
                        className="flex flex-col items-center bg-white rounded-xl shadow-md p-3 border-2 border-gray-200 min-w-[100px]"
                      >
                        <div className="text-xs text-gray-500 font-medium uppercase mb-1">
                          {month}
                        </div>
                        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-gray-500 text-white text-2xl font-bold mb-2">
                          {day}
                        </div>
                        <div className="text-lg font-bold text-gray-900">
                          {expired.amount.toFixed(2)} pts
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Contenido de tabs */}
          <TabsContent value={activeFilter} className="mt-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">Cargando reservas...</span>
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">
                  {activeFilter === 'confirmed' && '✅'}
                  {activeFilter === 'pending' && '⏳'}
                  {activeFilter === 'past' && '📜'}
                  {activeFilter === 'cancelled' && '❌'}
                </div>
                <p className="text-xl sm:text-2xl font-semibold text-gray-700">
                  {activeFilter === 'confirmed' && 'No tienes reservas con pista asignada'}
                  {activeFilter === 'pending' && 'No tienes inscripciones pendientes'}
                  {activeFilter === 'past' && 'No tienes clases pasadas'}
                  {activeFilter === 'cancelled' && 'No tienes clases canceladas'}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  {activeFilter === 'cancelled' ? 'Las clases canceladas aparecerán aquí' : 'Inscríbete en una clase para verla aquí'}
                </p>
              </div>
            ) : (
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {filteredBookings.map((booking) => {
                  const isClassBooking = !!booking.timeSlot;
                  const isMatchBooking = !!booking.matchGame;
                  const isCourtReservation = booking.type === 'court-reservation';
                  
                  if (isClassBooking) {
                    return (
                      <BookingCard
                        key={booking.id}
                        booking={booking}
                        currentUser={currentUser}
                        onBookingSuccess={handleBookingSuccess}
                        onCancelBooking={handleCancelBooking}
                        isPastClass={activeFilter === 'past'}
                        isCancelled={booking.status === 'CANCELLED'}
                      />
                    );
                  } else if (isMatchBooking) {
                    return (
                      <MatchGameCard
                        key={booking.id}
                        matchGame={booking.matchGame}
                        currentUser={currentUser}
                        onBookingSuccess={handleBookingSuccess}
                        showLeaveButton={true}
                        showPrivateBookingButton={false}
                      />
                    );
                  } else if (isCourtReservation) {
                    return (
                      <CourtReservationCard
                        key={booking.id}
                        reservation={booking}
                        onCancel={handleCancelCourtReservation}
                      />
                    );
                  }
                  return null;
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Leyenda informativa */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
            <span className="text-lg">ℹ️</span>
            Información sobre tus reservas
          </h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold">R</span>
              <strong>Reservas:</strong> Clases con pista asignada y grupo completo, listas para jugar
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-white text-xs font-bold">I</span>
              <strong>Inscripciones:</strong> Inscripciones sin pista asignada, esperando que se complete el grupo
            </li>
            <li><strong>📜 Pasadas:</strong> Clases finalizadas</li>
            <li><strong>❌ Canceladas:</strong> Clases que han sido canceladas</li>
            <li><strong>💡 Tip:</strong> Una inscripción pasa a "Confirmada" cuando se completa el grupo y se asigna pista</li>
            <li><strong>🚫 Límite:</strong> Solo puedes tener una reserva confirmada por día. Otras inscripciones del mismo día se cancelan automáticamente</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

// ✅ PERFORMANCE: Memoizar para evitar re-renders innecesarios
export default React.memo(UserBookings, (prevProps, nextProps) => {
  return prevProps.currentUser?.id === nextProps.currentUser?.id;
});
