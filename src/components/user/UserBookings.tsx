"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BookingCard from './BookingCard';
import MatchGameCard from '@/components/match/MatchGameCard';
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

interface MatchGameBookingWithDetails {
  id: string;
  userId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  user: {
    name: string;
    email: string;
    profilePictureUrl?: string;
  };
  matchGame: {
    id: string;
    start: string;
    end: string;
    level: string | null;
    isOpen: boolean;
    genderCategory: string | null;
    price: number;
    courtNumber: number | null;
    clubId: string;
    bookings?: any[];
  };
}

type CombinedBooking = 
  | { type: 'class'; data: BookingWithTimeSlot }
  | { type: 'match'; data: MatchGameBookingWithDetails };

const UserBookings: React.FC<UserBookingsProps> = ({ currentUser, onBookingActionSuccess }) => {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') as 'confirmed' | 'pending' | 'past' | 'cancelled' | null;
  
  const [bookings, setBookings] = useState<BookingWithTimeSlot[]>([]);
  const [matchBookings, setMatchBookings] = useState<MatchGameBookingWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'confirmed' | 'pending' | 'past' | 'cancelled'>(tabParam || 'pending');
  const { toast } = useToast();

  // Actualizar pestaña si cambia el parámetro URL
  useEffect(() => {
    if (tabParam && ['confirmed', 'pending', 'past', 'cancelled'].includes(tabParam)) {
      setActiveFilter(tabParam);
    }
  }, [tabParam]);

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
      
      // Cargar bookings de clases
      const classBookingsResponse = await fetch(`/api/users/${currentUser.id}/bookings`);
      if (classBookingsResponse.ok) {
        const classData = await classBookingsResponse.json();
        setBookings(classData);
        console.log(`✅ Cargadas ${classData.length} reservas de clases`);
      } else {
        console.error('❌ Error al cargar reservas de clases:', classBookingsResponse.statusText);
        setBookings([]);
      }
      
      // Cargar bookings de partidas
      const matchBookingsResponse = await fetch(`/api/users/${currentUser.id}/match-bookings`);
      if (matchBookingsResponse.ok) {
        const matchData = await matchBookingsResponse.json();
        setMatchBookings(matchData);
        console.log(`✅ Cargadas ${matchData.length} reservas de partidas`);
      } else {
        console.error('❌ Error al cargar reservas de partidas:', matchBookingsResponse.statusText);
        setMatchBookings([]);
      }
    } catch (error) {
      console.error('❌ Error al cargar reservas:', error);
      setBookings([]);
      setMatchBookings([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.id]);

  // Callback memoizado para onBookingSuccess (después de loadBookings)
  const handleBookingSuccess = useCallback(() => {
    loadBookings();
    if (onBookingActionSuccess) {
      onBookingActionSuccess();
    }
  }, [loadBookings, onBookingActionSuccess]);

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

  // Memoizar filtrado combinado (clases + partidas)
  const filteredCombinedBookings = useMemo((): CombinedBooking[] => {
    const now = new Date();
    const combined: CombinedBooking[] = [];
    
    // Filtrar bookings de clases
    const filteredClassBookings = bookings.filter(b => {
      switch (activeFilter) {
        case 'confirmed': {
          const hasCourtAssigned = b.timeSlot.court !== null || b.timeSlot.courtId !== null || b.timeSlot.courtNumber !== null;
          const isFuture = new Date(b.timeSlot.start) >= now;
          const isBookingConfirmed = b.status === 'CONFIRMED';
          return hasCourtAssigned && isFuture && isBookingConfirmed;
        }
        case 'pending': {
          const noCourtAssigned = b.timeSlot.court === null && (b.timeSlot.courtId === null || b.timeSlot.courtId === undefined) && (b.timeSlot.courtNumber === null || b.timeSlot.courtNumber === undefined);
          const isFuture = new Date(b.timeSlot.start) >= now;
          const isNotCancelled = b.status !== 'CANCELLED';
          return noCourtAssigned && isFuture && isNotCancelled;
        }
        case 'past': {
          const isPast = new Date(b.timeSlot.start) < now;
          const isNotCancelled = b.status !== 'CANCELLED';
          return isPast && isNotCancelled;
        }
        case 'cancelled': {
          const isCancelled = b.status === 'CANCELLED';
          const wasConfirmed = (b as any).wasConfirmed === true;
          return isCancelled && wasConfirmed;
        }
        default:
          return true;
      }
    });
    
    // Filtrar bookings de partidas
    const filteredMatchBookings = matchBookings.filter(mb => {
      switch (activeFilter) {
        case 'confirmed': {
          const hasCourtAssigned = mb.matchGame.courtNumber !== null;
          const isFuture = new Date(mb.matchGame.start) >= now;
          const isBookingConfirmed = mb.status === 'CONFIRMED';
          return hasCourtAssigned && isFuture && isBookingConfirmed;
        }
        case 'pending': {
          const noCourtAssigned = mb.matchGame.courtNumber === null;
          const isFuture = new Date(mb.matchGame.start) >= now;
          const isNotCancelled = mb.status !== 'CANCELLED';
          return noCourtAssigned && isFuture && isNotCancelled;
        }
        case 'past': {
          const isPast = new Date(mb.matchGame.start) < now;
          const isNotCancelled = mb.status !== 'CANCELLED';
          return isPast && isNotCancelled;
        }
        case 'cancelled': {
          const isCancelled = mb.status === 'CANCELLED';
          return isCancelled;
        }
        default:
          return true;
      }
    });
    
    // Combinar y convertir a formato unificado
    filteredClassBookings.forEach(b => combined.push({ type: 'class', data: b }));
    filteredMatchBookings.forEach(mb => combined.push({ type: 'match', data: mb }));
    
    // Ordenar por fecha de inicio
    combined.sort((a, b) => {
      const dateA = new Date(a.type === 'class' ? a.data.timeSlot.start : a.data.matchGame.start);
      const dateB = new Date(b.type === 'class' ? b.data.timeSlot.start : b.data.matchGame.start);
      return dateA.getTime() - dateB.getTime();
    });
    
    return combined;
  }, [bookings, matchBookings, activeFilter]);

  // Memoizar contadores para evitar recalcular en cada render
  const counts = useMemo(() => {
    const now = new Date();
    return {
      confirmed: bookings.filter(b => {
        const hasCourtAssigned = b.timeSlot.court !== null || b.timeSlot.courtId !== null || b.timeSlot.courtNumber !== null;
        const isFuture = new Date(b.timeSlot.start) >= now;
        const isBookingConfirmed = b.status === 'CONFIRMED';
        return hasCourtAssigned && isFuture && isBookingConfirmed;
      }).length + matchBookings.filter(mb => {
        const hasCourtAssigned = mb.matchGame.courtNumber !== null;
        const isFuture = new Date(mb.matchGame.start) >= now;
        const isBookingConfirmed = mb.status === 'CONFIRMED';
        return hasCourtAssigned && isFuture && isBookingConfirmed;
      }).length,
      pending: bookings.filter(b => {
        const noCourtAssigned = b.timeSlot.court === null && (b.timeSlot.courtId === null || b.timeSlot.courtId === undefined) && (b.timeSlot.courtNumber === null || b.timeSlot.courtNumber === undefined);
        const isFuture = new Date(b.timeSlot.start) >= now;
        const isNotCancelled = b.status !== 'CANCELLED';
        return noCourtAssigned && isFuture && isNotCancelled;
      }).length + matchBookings.filter(mb => {
        const noCourtAssigned = mb.matchGame.courtNumber === null;
        const isFuture = new Date(mb.matchGame.start) >= now;
        const isNotCancelled = mb.status !== 'CANCELLED';
        return noCourtAssigned && isFuture && isNotCancelled;
      }).length,
      past: bookings.filter(b => {
        const isPast = new Date(b.timeSlot.start) < now;
        const isNotCancelled = b.status !== 'CANCELLED';
        return isPast && isNotCancelled;
      }).length + matchBookings.filter(mb => {
        const isPast = new Date(mb.matchGame.start) < now;
        const isNotCancelled = mb.status !== 'CANCELLED';
        return isPast && isNotCancelled;
      }).length,
      cancelled: bookings.filter(b => {
        const isCancelled = b.status === 'CANCELLED';
        const wasConfirmed = (b as any).wasConfirmed === true;
        return isCancelled && wasConfirmed;
      }).length + matchBookings.filter(mb => {
        return mb.status === 'CANCELLED';
      }).length,
    };
  }, [bookings, matchBookings]);

  // Calcular saldos bloqueados por fecha (inscripciones pendientes)
  // ⚠️ REGLA: Solo se bloquea el precio MÁS ALTO del día, porque solo puede tener 1 reserva confirmada por día
  const blockedBalances = useMemo(() => {
    const now = new Date();
    const pendingBookings = bookings.filter(b => {
      const noCourtAssigned = b.timeSlot.court === null && 
        (b.timeSlot.courtId === null || b.timeSlot.courtId === undefined) && 
        (b.timeSlot.courtNumber === null || b.timeSlot.courtNumber === undefined);
      const isFuture = new Date(b.timeSlot.start) >= now;
      const isNotCancelled = b.status !== 'CANCELLED';
      return noCourtAssigned && isFuture && isNotCancelled;
    });

    // Agrupar por fecha y encontrar el precio MÁS ALTO de cada día
    const balancesByDate: { [date: string]: { date: Date, amount: number } } = {};
    
    pendingBookings.forEach(booking => {
      const startDate = new Date(booking.timeSlot.start);
      const dateKey = startDate.toISOString().split('T')[0]; // YYYY-MM-DD
      
      // ✅ Fórmula correcta: totalPrice dividido entre groupSize
      // Ejemplo: Si totalPrice = 60€ y groupSize = 2, bloquea 30€ (60/2)
      const blockedAmount = booking.timeSlot.totalPrice / booking.groupSize;
      
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
      const hasCourtAssigned = b.timeSlot.court !== null || b.timeSlot.courtId !== null || b.timeSlot.courtNumber !== null;
      const isFuture = new Date(b.timeSlot.start) >= now;
      const isBookingConfirmed = b.status === 'CONFIRMED'; // ✅ Verificar que el booking esté CONFIRMED
      return hasCourtAssigned && isFuture && isBookingConfirmed;
    });

    // Agrupar por fecha y calcular monto pagado
    const amountsByDate: { [date: string]: { date: Date, amount: number } } = {};
    
    confirmedBookings.forEach(booking => {
      const startDate = new Date(booking.timeSlot.start);
      const dateKey = startDate.toISOString().split('T')[0]; // YYYY-MM-DD
      
      // Calcular el monto pagado por esta reserva
      const paidAmount = booking.timeSlot.totalPrice / booking.groupSize;
      
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
      const startDate = new Date(booking.timeSlot.start);
      const dateKey = startDate.toISOString().split('T')[0]; // YYYY-MM-DD
      
      // Calcular puntos retornados por esta cancelación
      const refundedAmount = booking.timeSlot.totalPrice / booking.groupSize;
      
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
      const noCourtAssigned = b.timeSlot.court === null && 
        (b.timeSlot.courtId === null || b.timeSlot.courtId === undefined) && 
        (b.timeSlot.courtNumber === null || b.timeSlot.courtNumber === undefined);
      const isPast = new Date(b.timeSlot.start) < now;
      const isNotCancelled = b.status !== 'CANCELLED';
      // Estas son inscripciones que expiraron sin confirmarse
      return noCourtAssigned && isPast && isNotCancelled;
    });

    console.log('🔍 Inscripciones expiradas encontradas:', expiredBookings.length);
    if (expiredBookings.length > 0) {
      console.log('📋 Detalles:', expiredBookings.map(b => ({
        fecha: new Date(b.timeSlot.start).toLocaleString('es-ES'),
        precio: b.timeSlot.totalPrice,
        groupSize: b.groupSize,
        calculado: b.timeSlot.totalPrice / b.groupSize
      })));
    }

    // Agrupar por fecha y sumar saldos desbloqueados
    const balancesByDate: { [date: string]: { date: Date, amount: number } } = {};
    
    expiredBookings.forEach(booking => {
      const startDate = new Date(booking.timeSlot.start);
      const dateKey = startDate.toISOString().split('T')[0]; // YYYY-MM-DD
      
      // Calcular saldo desbloqueado por esta inscripción expirada
      const unlockedAmount = booking.timeSlot.totalPrice / booking.groupSize;
      
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
                  ? 'scale-105 shadow-2xl animate-bounce-subtle ring-4 ring-blue-300 ring-opacity-50' 
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
                  ? 'scale-105 shadow-2xl animate-bounce-subtle ring-4 ring-red-300 ring-opacity-50' 
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
                  ? 'scale-105 shadow-2xl animate-bounce-subtle ring-4 ring-gray-300 ring-opacity-50' 
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
                  ? 'scale-105 shadow-2xl animate-bounce-subtle ring-4 ring-orange-300 ring-opacity-50' 
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
            ) : filteredCombinedBookings.length === 0 ? (
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
                  {activeFilter === 'past' && 'No tienes clases o partidas pasadas'}
                  {activeFilter === 'cancelled' && 'No tienes reservas canceladas'}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  {activeFilter === 'cancelled' ? 'Las reservas canceladas aparecerán aquí' : 'Inscríbete en una clase o partida para verla aquí'}
                </p>
              </div>
            ) : (
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {filteredCombinedBookings.map((combinedBooking) => {
                  if (combinedBooking.type === 'class') {
                    return (
                      <BookingCard
                        key={`class-${combinedBooking.data.id}`}
                        booking={combinedBooking.data}
                        currentUser={currentUser}
                        onBookingSuccess={handleBookingSuccess}
                        onCancelBooking={handleCancelBooking}
                        isPastClass={activeFilter === 'past'}
                        isCancelled={combinedBooking.data.status === 'CANCELLED'}
                      />
                    );
                  } else {
                    // Renderizar tarjeta de partida usando MatchGameCard (mismo diseño que el panel principal)
                    const mb = combinedBooking.data;
                    
                    return (
                      <MatchGameCard
                        key={`match-${mb.id}`}
                        matchGame={mb.matchGame}
                        currentUser={currentUser}
                        onBookingSuccess={handleBookingSuccess}
                        showLeaveButton={true}
                        showPrivateBookingButton={false}
                      />
                    );
                  }
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
