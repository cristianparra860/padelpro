"use client";

import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, Users, Euro, Trophy, X, Users2, Venus, Mars, Loader2 } from 'lucide-react';
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
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { User } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { cn, roundPrice } from '@/lib/utils';

interface MatchGameCardProps {
  matchGame: any;
  currentUser: User | null;
  onBookingSuccess: () => void;
  showLeaveButton?: boolean; // Control para mostrar/ocultar botón Cancelar
  showPrivateBookingButton?: boolean; // Control para mostrar/ocultar botón Reserva Privada
}

interface Booking {
  userId: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  name?: string;
  profilePictureUrl?: string;
  userLevel?: string;
  userGender?: string;
  isRecycled?: boolean;
}

const MatchGameCard: React.FC<MatchGameCardProps> = ({
  matchGame,
  currentUser,
  onBookingSuccess,
  showLeaveButton = false, // Por defecto no mostrar el botón en el calendario
  showPrivateBookingButton = true, // Por defecto mostrar botón Reserva Privada
}) => {
  const { toast } = useToast();
  const [booking, setBooking] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  
  // 🆕 Estados para cesión parcial de plazas en partidas
  const [showPartialTransferDialog, setShowPartialTransferDialog] = useState(false);
  const [slotsToTransfer, setSlotsToTransfer] = useState<number>(1);

  // Parse bookings (incluir CANCELLED si es reciclado)
  const bookings: Booking[] = useMemo(() => {
    if (!matchGame.bookings || !Array.isArray(matchGame.bookings)) return [];
    return matchGame.bookings.filter((b: any) => 
      b.status !== 'CANCELLED' || (b.status === 'CANCELLED' && b.isRecycled === true)
    );
  }, [matchGame.bookings]);

  // Check if user is already booked
  const userBooking = useMemo(() => {
    if (!currentUser?.id) return null;
    return bookings.find(b => b.userId === currentUser.id);
  }, [bookings, currentUser?.id]);

  const isUserBooked = !!userBooking;

  // Detectar si es una reserva privada (1 usuario con las 4 plazas)
  const isPrivateBooking = useMemo(() => {
    if (bookings.length !== 1) return false;
    // Si hay courtNumber asignado y solo 1 booking, es reserva privada
    return matchGame.courtNumber && bookings.length === 1;
  }, [bookings, matchGame.courtNumber]);

  // Si es reserva privada, replicar el usuario 4 veces
  const displayBookings = useMemo(() => {
    if (isPrivateBooking && bookings.length === 1) {
      const privateUser = bookings[0];
      return [privateUser, privateUser, privateUser, privateUser];
    }
    return bookings;
  }, [isPrivateBooking, bookings]);

  // Level and gender info
  const levelInfo = useMemo(() => {
    // Si no hay jugadores inscritos, mostrar "ABIERTO"
    if (bookings.length === 0) {
      return {
        level: 'Abierto',
        isAssigned: false
      };
    }
    
    // Si hay jugadores, obtener el nivel del primer jugador
    const firstPlayer = bookings[0];
    const playerLevel = firstPlayer.userLevel;
    
    if (!playerLevel) {
      return {
        level: 'Abierto',
        isAssigned: false
      };
    }
    
    // Convertir el nivel del jugador a un rango
    // Por ejemplo: si es "2.5", el rango podría ser "2.0 - 3.0"
    const numLevel = parseFloat(playerLevel);
    if (isNaN(numLevel)) {
      return {
        level: 'Abierto',
        isAssigned: false
      };
    }
    
    // Determinar el rango basado en el nivel
    let rangeLabel = '';
    if (numLevel < 1.5) {
      rangeLabel = '0.0 - 1.5';
    } else if (numLevel < 2.5) {
      rangeLabel = '1.5 - 2.5';
    } else if (numLevel < 3.5) {
      rangeLabel = '2.5 - 3.5';
    } else if (numLevel < 4.5) {
      rangeLabel = '3.5 - 4.5';
    } else if (numLevel < 5.5) {
      rangeLabel = '4.5 - 5.5';
    } else {
      rangeLabel = '5.5 - 7.0';
    }
    
    return {
      level: rangeLabel,
      isAssigned: true
    };
  }, [bookings]);

  const categoryInfo = useMemo(() => {
    // Si no hay jugadores inscritos, mostrar "Abierta"
    if (bookings.length === 0) {
      return {
        category: 'abierta',
        isAssigned: false
      };
    }
    
    // Analizar géneros de TODOS los jugadores inscritos
    const genders = bookings
      .map(b => b.userGender)
      .filter(g => g && g !== 'undefined' && g !== 'null');
    
    if (genders.length === 0) {
      return {
        category: 'abierta',
        isAssigned: false
      };
    }
    
    // Determinar la categoría basándose en los géneros
    const uniqueGenders = [...new Set(genders)];
    let categoryLabel = 'abierta';
    
    if (uniqueGenders.length === 1) {
      // Todos del mismo género
      if (uniqueGenders[0] === 'masculino') {
        categoryLabel = 'chicos';
      } else if (uniqueGenders[0] === 'femenino') {
        categoryLabel = 'chicas';
      }
    } else if (uniqueGenders.length > 1) {
      // Hay mezcla de géneros
      categoryLabel = 'mixto';
    }
    
    return {
      category: categoryLabel,
      isAssigned: true
    };
  }, [bookings]);

  const courtAssignment = useMemo(() => {
    if (matchGame.courtNumber) {
      return {
        isAssigned: true,
        courtNumber: matchGame.courtNumber
      };
    }
    return {
      isAssigned: false,
      courtNumber: null
    };
  }, [matchGame.courtNumber]);

  // Format time
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return format(date, 'HH:mm', { locale: es });
  };

  const toDateObject = (dateStr: string) => {
    return new Date(dateStr);
  };

  // Helper para obtener iniciales
  const getInitials = (name: string | undefined) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Handle booking
  const handleBook = async () => {
    if (!currentUser) {
      toast({
        title: "Error",
        description: "Debes iniciar sesión para reservar",
        variant: "destructive"
      });
      return;
    }

    setBooking(true);
    try {
      const response = await fetch('/api/matchgames/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId: currentUser.id,
          matchGameId: matchGame.id,
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        toast({
          title: "¡Reserva realizada!",
          description: result.message || "Has reservado tu plaza en la partida.",
          className: "bg-green-600 text-white"
        });

        setShowConfirmDialog(false);
        onBookingSuccess();
      } else {
        const error = await response.json();
        toast({
          title: "Error en la reserva",
          description: error.error || "No se pudo completar la reserva",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error booking:', error);
      toast({
        title: "Error de conexión",
        description: "No se pudo conectar con el servidor",
        variant: "destructive"
      });
    } finally {
      setBooking(false);
    }
  };

  // Handle private booking (reservar pista completa)
  const handlePrivateBooking = async () => {
    if (!currentUser) {
      toast({
        title: "Error",
        description: "Debes iniciar sesión para reservar",
        variant: "destructive"
      });
      return;
    }

    setBooking(true);
    try {
      const response = await fetch('/api/matchgames/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId: currentUser.id,
          matchGameId: matchGame.id,
          privateBooking: true, // Indicador de reserva privada completa
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        toast({
          title: "¡Pista reservada!",
          description: result.message || "Has reservado la pista completa.",
          className: "bg-green-600 text-white"
        });

        onBookingSuccess();
      } else {
        const error = await response.json();
        toast({
          title: "Error en la reserva",
          description: error.error || "No se pudo completar la reserva",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error booking:', error);
      toast({
        title: "Error de conexión",
        description: "No se pudo conectar con el servidor",
        variant: "destructive"
      });
    } finally {
      setBooking(false);
    }
  };

  // 🆕 Contar cuántos bookings tiene el usuario en esta partida (para reservas múltiples/privadas)
  const getUserBookingsCount = () => {
    if (!currentUser?.id || !matchGame.bookings) return 0;
    // Contar todos los bookings ACTIVOS del usuario (no cancelados, excepto reciclados)
    return matchGame.bookings.filter((b: any) => 
      b.userId === currentUser.id && 
      (b.status !== 'CANCELLED' || b.isRecycled === true)
    ).length;
  };

  // 🆕 Detectar si el usuario tiene una reserva privada (1 booking con monto total >10€)
  const hasPrivateBooking = useMemo(() => {
    if (!currentUser?.id || !matchGame.bookings) return false;
    
    const userBookings = matchGame.bookings.filter((b: any) => 
      b.userId === currentUser.id && 
      (b.status !== 'CANCELLED' || b.isRecycled === true)
    );
    
    if (userBookings.length !== 1) return false;
    
    const totalAmountBlocked = userBookings.reduce((sum: number, b: any) => 
      sum + Number(b.amountBlocked || 0), 0
    );
    
    // Si hay 1 booking con >10€ bloqueado, es reserva privada (4 plazas)
    return totalAmountBlocked > 1000;
  }, [matchGame.bookings, currentUser?.id]);

  // 🆕 Función para ceder plazas parciales en partidas
  const handlePartialTransfer = async (slots: number) => {
    if (!currentUser?.id || !matchGame.id || slots < 1 || slots > 4) {
      toast({
        title: "Error",
        description: "Número de plazas inválido",
        variant: "destructive"
      });
      return;
    }

    setBooking(true);
    setShowPartialTransferDialog(false);

    try {
      const response = await fetch(`/api/matchgames/${matchGame.id}/leave-partial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          slotsToTransfer: slots
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        toast({
          title: `♻️ ${slots} plaza${slots > 1 ? 's' : ''} cedida${slots > 1 ? 's' : ''}`,
          description: `Has recibido ${data.pointsGranted || 0} puntos de compensación. Las plazas están disponibles para otros jugadores.`,
          className: "bg-yellow-500 text-white",
          duration: 5000
        });

        onBookingSuccess();
      } else {
        const errorData = await response.json();
        toast({
          title: "Error al ceder plazas",
          description: errorData.error || "No se pudieron ceder las plazas",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error al ceder plazas:', error);
      toast({
        title: "Error de conexión",
        description: "No se pudo conectar con el servidor",
        variant: "destructive"
      });
    } finally {
      setBooking(false);
    }
  };

  // Handle leave
  const handleLeave = async () => {
    if (!currentUser || !userBooking) {
      return;
    }

    setBooking(true);
    try {
      const response = await fetch(`/api/matchgames/${matchGame.id}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId: currentUser.id,
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        toast({
          title: "Reserva cancelada",
          description: result.message || "Has abandonado la partida.",
          className: "bg-orange-600 text-white"
        });

        setShowLeaveDialog(false);
        onBookingSuccess();
      } else {
        const error = await response.json();
        toast({
          title: "Error al cancelar",
          description: error.error || "No se pudo cancelar la reserva",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error leaving:', error);
      toast({
        title: "Error de conexión",
        description: "No se pudo conectar con el servidor",
        variant: "destructive"
      });
    } finally {
      setBooking(false);
    }
  };

  const spotsLeft = 4 - bookings.length;

  return (
    <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow bg-white border-2 border-gray-200 rounded-2xl w-full scale-[0.88]">
      {/* Header con Badge de estado */}
      <div className="bg-gradient-to-r from-green-500 to-green-600 px-3 py-1.5">
        <div className="flex items-center justify-between">
          {/* Icono decorativo y duración */}
          <div className="flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-white" />
            <span className="text-white text-[10px] font-semibold">(90min)</span>
          </div>
          
          {/* Botón Reserva Privada O Botón Cancelar */}
          {isPrivateBooking && showLeaveButton && isUserBooked ? (
            // Si es reserva privada Y el usuario es el dueño, mostrar botón de cancelar/ceder
            <Button
              size="sm"
              variant="outline"
              className={`h-6 text-[10px] px-2 bg-white border-white ${
                userBooking?.status === 'CONFIRMED'
                  ? 'hover:bg-yellow-50 text-yellow-700 hover:border-yellow-200'
                  : 'hover:bg-red-50 text-red-700 hover:border-red-200'
              }`}
              onClick={() => {
                // Para reservas privadas confirmadas, mostrar diálogo de cesión parcial
                if (userBooking?.status === 'CONFIRMED') {
                  setShowPartialTransferDialog(true);
                } else {
                  setShowLeaveDialog(true);
                }
              }}
              disabled={booking}
            >
              {booking ? (userBooking?.status === 'CONFIRMED' ? 'Cediendo...' : 'Cancelando...') : (
                userBooking?.status === 'CONFIRMED' ? '♻️ Ceder Plaza' : 'Cancelar'
              )}
            </Button>
          ) : isPrivateBooking ? (
            // Si es reserva privada pero el usuario NO es el dueño, mostrar badge
            <Badge variant="outline" className="h-6 text-[10px] px-2 bg-blue-600 text-white border-white">
              Reserva Privada
            </Badge>
          ) : showLeaveButton && isUserBooked ? (
            // Si NO es reserva privada pero el usuario está inscrito, mostrar botón
            (() => {
              const userBookingsCount = getUserBookingsCount();
              const hasMultipleBookings = userBookingsCount > 1;
              
              return (
                <Button
                  size="sm"
                  variant="outline"
                  className={`h-6 text-[10px] px-2 bg-white border-white ${
                    userBooking?.status === 'CONFIRMED'
                      ? 'hover:bg-yellow-50 text-yellow-700 hover:border-yellow-200'
                      : 'hover:bg-red-50 text-red-700 hover:border-red-200'
                  }`}
                  onClick={() => {
                    // Si tiene múltiples bookings y está confirmado, mostrar diálogo parcial
                    if (hasMultipleBookings && userBooking?.status === 'CONFIRMED') {
                      setShowPartialTransferDialog(true);
                    } else {
                      setShowLeaveDialog(true);
                    }
                  }}
                  disabled={booking}
                >
                  {booking ? (userBooking?.status === 'CONFIRMED' ? 'Cediendo...' : 'Cancelando...') : (
                    userBooking?.status === 'CONFIRMED' ? '♻️ Ceder Plaza' : 'Cancelar'
                  )}
                </Button>
              );
            })()
          ) : showPrivateBookingButton ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-[10px] px-2 bg-white hover:bg-gray-50 text-blue-600 border-white font-bold shadow-[0_2px_8px_rgba(59,130,246,0.5)]"
                  disabled={booking}
                >
                  {booking ? 'Reservando...' : 'clica aqui para reservar pista'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar Reserva de Pista</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-3">
                    <div className="text-base text-gray-900 font-medium">
                      ¿Deseas reservar la pista completa para esta partida?
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-700">📅 Fecha:</span>
                        <span className="font-medium">{format(new Date(matchGame.start), "EEEE d 'de' MMMM", { locale: es })}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">⏰ Hora:</span>
                        <span className="font-medium">{format(new Date(matchGame.start), 'HH:mm')} - {format(new Date(matchGame.end), 'HH:mm')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">⏱️ Duración:</span>
                        <span className="font-medium">{matchGame.duration} minutos</span>
                      </div>
                      <div className="flex justify-between border-t border-blue-200 pt-2 mt-2">
                        <span className="text-gray-700 font-semibold">💰 Precio Total:</span>
                        <span className="font-bold text-lg text-blue-600">€{roundPrice(matchGame.courtRentalPrice || 0).toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 bg-yellow-50 p-2 rounded">
                      <strong>Nota:</strong> Se te asignará una pista automáticamente y se bloqueará el importe total de tu saldo.
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handlePrivateBooking}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Confirmar Reserva
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}
        </div>
      </div>

      <div className="p-2.5">
        {/* Class Info */}
        <div className="grid grid-cols-3 gap-1.5 text-center text-sm text-gray-600 border-b border-gray-100 pb-2 mb-2">
          <div>
            <div className="font-medium text-gray-900 text-[10px]">Nivel</div>
            <div 
              className={`capitalize px-1.5 py-1 rounded-full text-[10px] font-medium shadow-[inset_0_4px_8px_rgba(0,0,0,0.3)] ${
                levelInfo.isAssigned 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {levelInfo.level}
            </div>
          </div>
          <div>
            <div className="font-medium text-gray-900 text-[10px]">Cat.</div>
            <div 
              className={`capitalize px-1.5 py-1 rounded-full text-[10px] font-medium shadow-[inset_0_4px_8px_rgba(0,0,0,0.3)] ${
                categoryInfo.category === 'chicos'
                  ? 'bg-blue-100 text-blue-700'
                  : categoryInfo.category === 'chicas'
                  ? 'bg-pink-100 text-pink-700'
                  : categoryInfo.isAssigned 
                  ? 'bg-purple-100 text-purple-700' 
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {categoryInfo.category}
            </div>
          </div>
          <div>
            <div className="font-medium text-gray-900 text-[10px]">Pista</div>
            <div 
              className={`px-1.5 py-1 rounded-full text-[10px] font-medium shadow-[inset_0_4px_8px_rgba(0,0,0,0.3)] ${
                courtAssignment.isAssigned 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {courtAssignment.isAssigned 
                ? `Pista ${courtAssignment.courtNumber}` 
                : 'Pista'
              }
            </div>
          </div>
        </div>

        {/* Time and Duration */}
        <div className="bg-gray-50 rounded-xl p-2 border border-gray-200 mb-2">
          <div className="flex items-center justify-between">
            {/* Fecha - Izquierda */}
            <div className="flex items-center gap-2">
              {/* Número del día */}
              <div className="text-[1.5rem] font-black text-gray-900 leading-none min-w-[2.5rem] text-center">
                {format(toDateObject(matchGame.start), 'dd', { locale: es })}
              </div>
              {/* Día y mes en texto */}
              <div className="flex flex-col justify-center gap-0.5">
                <div className="text-xs font-bold text-gray-900 uppercase tracking-tight leading-none">
                  {format(toDateObject(matchGame.start), 'EEEE', { locale: es })}
                </div>
                <div className="text-[10px] font-normal text-gray-500 capitalize leading-none">
                  {format(toDateObject(matchGame.start), 'MMMM', { locale: es })}
                </div>
              </div>
            </div>
            
            {/* Hora y duración - Derecha */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xl font-bold text-gray-900 leading-none">
                  {formatTime(matchGame.start)}
                </div>
                <div className="text-[10px] text-gray-500 flex items-center justify-end gap-1 mt-0.5">
                  <Clock className="w-2.5 h-2.5" />
                  <span>{matchGame.duration} min</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Players Grid - 4 jugadores fijo */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <Users2 className="w-3.5 h-3.5 text-gray-600" />
              <span className="text-xs font-semibold text-gray-900">
                Jugadores
              </span>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-base font-bold text-gray-900">
                € {isPrivateBooking 
                  ? roundPrice(matchGame.courtRentalPrice).toFixed(2)
                  : roundPrice(matchGame.courtRentalPrice / 4).toFixed(2)
                }
              </div>
              <div className="text-[9px] text-gray-500">
                {isPrivateBooking ? 'pista completa' : 'por plaza'}
              </div>
            </div>
          </div>

          <div className="flex justify-center items-center gap-3 py-1.5">
            {[0, 1, 2, 3].map((index) => {
              const booking = displayBookings[index];
              const isOccupied = !!booking;
              const isRecycled = booking?.isRecycled === true && booking?.status === 'CANCELLED';
              const displayName = isRecycled ? 'Plaza cedida' : (booking?.name || 'Disponible');
              const playerLevel = booking?.userLevel || '?';

              return (
                <div key={index} className="flex flex-col items-center gap-1 relative">
                  {/* 🎯 Badge de nivel a la derecha del avatar - No mostrar si es plaza reciclada */}
                  {isOccupied && !isRecycled && (
                    <div className="absolute -right-2 top-0 z-10">
                      <div className="bg-white text-gray-700 rounded-full w-5 h-5 flex items-center justify-center text-[9px] font-bold border border-gray-700" style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.1)' }}>
                        {playerLevel}
                      </div>
                    </div>
                  )}
                  
                  <div 
                    className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center text-xl font-semibold transition-all",
                      isRecycled
                        ? "bg-yellow-100 border-2 border-dashed border-yellow-500 shadow-[inset_0_4px_8px_rgba(0,0,0,0.2)] cursor-pointer hover:bg-yellow-200 hover:border-yellow-600"
                        : isOccupied 
                        ? "bg-white border-2 border-gray-200 shadow-[inset_0_4px_8px_rgba(0,0,0,0.3)] cursor-default" 
                        : isPrivateBooking
                        ? "bg-gray-100 border-2 border-gray-300 text-gray-400 shadow-[inset_0_4px_8px_rgba(0,0,0,0.3)] cursor-not-allowed opacity-50"
                        : "bg-gray-100 border-2 border-gray-300 text-gray-400 shadow-[inset_0_4px_8px_rgba(0,0,0,0.3)] cursor-pointer hover:bg-gray-200 hover:border-gray-400"
                    )}
                    title={isRecycled ? 'Plaza cedida - Solo con puntos' : (isOccupied ? booking.name : isPrivateBooking ? 'Reserva privada completa' : 'Clic para unirte')}
                    onClick={() => {
                      if ((isRecycled || (!isOccupied && !booking)) && !isUserBooked && !isPrivateBooking) {
                        setShowConfirmDialog(true);
                      }
                    }}
                  >
                    {isRecycled ? (
                      <div className="flex flex-col items-center justify-center">
                        <span className="text-2xl">♻️</span>
                      </div>
                    ) : isOccupied ? (
                      booking.profilePictureUrl ? (
                        <img 
                          src={booking.profilePictureUrl} 
                          alt={booking.name || 'Usuario'}
                          className="w-full h-full object-cover rounded-full shadow-[inset_0_4px_8px_rgba(0,0,0,0.3)]"
                        />
                      ) : (
                        <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center shadow-[inset_0_4px_8px_rgba(0,0,0,0.3)]">
                          <span className="text-white text-xs font-bold">
                            {getInitials(booking.name || booking.userId)}
                          </span>
                        </div>
                      )
                    ) : (
                      '+'
                    )}
                  </div>
                  <span className="text-[10px] font-medium leading-none">
                    {isOccupied ? (
                      <span className="text-gray-700">{displayName.split(' ')[0]}</span>
                    ) : isPrivateBooking ? (
                      <span className="text-gray-400">Ocupado</span>
                    ) : (
                      <span className="text-green-400">Libre</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
          
          {/* Indicador de plazas recicladas disponibles */}
          {matchGame.hasRecycledSlots && matchGame.availableRecycledSlots > 0 && (
            <div className="mt-2 px-2 py-1 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center justify-center gap-2 text-xs">
                <span className="text-yellow-600">♻️</span>
                <span className="text-yellow-700 font-medium">
                  {matchGame.availableRecycledSlots} plaza{matchGame.availableRecycledSlots > 1 ? 's' : ''} cedida{matchGame.availableRecycledSlots > 1 ? 's' : ''} 
                  <span className="font-bold"> (Solo puntos)</span>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Available Courts - Indicadores de disponibilidad de pistas */}
        <div className="px-2 py-1.5 bg-gray-50 border-t border-gray-100">
          <div className="text-center">
            {courtAssignment.isAssigned ? (
              <>
                <div className="text-[10px] text-gray-500 text-center mb-1">Pista asignada:</div>
                <div className="flex items-center justify-center gap-1">
                  <div className="flex flex-col items-center">
                    <svg 
                      className="shadow-inner-custom" 
                      width="19" 
                      height="32" 
                      viewBox="0 0 40 60" 
                      fill="none" 
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <defs>
                        <filter id="innerShadow-assigned" x="-50%" y="-50%" width="200%" height="200%">
                          <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur"/>
                          <feOffset in="blur" dx="0" dy="1" result="offsetBlur"/>
                          <feFlood floodColor="#000000" floodOpacity="0.25" result="offsetColor"/>
                          <feComposite in="offsetColor" in2="offsetBlur" operator="in" result="offsetBlur"/>
                          <feComposite in="SourceGraphic" in2="offsetBlur" operator="over"/>
                        </filter>
                      </defs>
                      <rect x="2" y="2" width="36" height="56" rx="4" fill="#10B981" stroke="#059669" strokeWidth="2" filter="url(#innerShadow-assigned)"/>
                      <line x1="20" y1="2" x2="20" y2="58" stroke="#FFFFFF" strokeWidth="1.5" strokeDasharray="3 3"/>
                      <line x1="2" y1="30" x2="38" y2="30" stroke="#FFFFFF" strokeWidth="1" opacity="0.5"/>
                    </svg>
                    <div className="text-green-600 font-semibold text-[9px] leading-none mt-0.5">
                      PISTA {courtAssignment.courtNumber}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="text-[10px] text-gray-500 text-center mb-1">
                  Disponibilidad de pistas
                </div>
                <div className="flex items-center justify-center gap-2">
                  {matchGame.courtsAvailability && Array.isArray(matchGame.courtsAvailability) && matchGame.courtsAvailability.length > 0 ? (
                    matchGame.courtsAvailability.map((court: any) => {
                      const fillColor = court.status === 'available' 
                        ? '#10B981'  // Verde - disponible
                        : court.status === 'occupied'
                        ? '#EF4444'  // Rojo - ocupada
                        : '#9CA3AF'; // Gris - no disponible
                      
                      const strokeColor = court.status === 'available'
                        ? '#059669'
                        : court.status === 'occupied'
                        ? '#DC2626'
                        : '#6B7280';
                      
                      const statusText = court.status === 'available'
                        ? 'Disponible'
                        : court.status === 'occupied'
                        ? 'Ocupada'
                        : 'No disponible';
                      
                      return (
                        <div key={court.courtId} className="relative group flex flex-col items-center" title={`Pista ${court.courtNumber}: ${statusText}`}>
                          <svg 
                            className="transition-transform hover:scale-110 shadow-inner-custom" 
                            width="19" 
                            height="32" 
                            viewBox="0 0 40 60" 
                            fill="none" 
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <defs>
                              <filter id={`innerShadow-${court.courtId}`} x="-50%" y="-50%" width="200%" height="200%">
                                <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur"/>
                                <feOffset in="blur" dx="0" dy="1" result="offsetBlur"/>
                                <feFlood floodColor="#000000" floodOpacity="0.25" result="offsetColor"/>
                                <feComposite in="offsetColor" in2="offsetBlur" operator="in" result="offsetBlur"/>
                                <feComposite in="SourceGraphic" in2="offsetBlur" operator="over"/>
                              </filter>
                            </defs>
                            <rect x="2" y="2" width="36" height="56" rx="4" fill={fillColor} stroke={strokeColor} strokeWidth="2" filter={`url(#innerShadow-${court.courtId})`}/>
                            <line x1="20" y1="2" x2="20" y2="58" stroke="#FFFFFF" strokeWidth="1.5" strokeDasharray="3 3"/>
                            <line x1="2" y1="30" x2="38" y2="30" stroke="#FFFFFF" strokeWidth="1" opacity="0.5"/>
                          </svg>
                          
                          {/* 🔴 X ROJA para pistas ocupadas */}
                          {court.status === 'occupied' && (
                            <div className="text-red-600 font-bold text-xs leading-none mt-0.5">✕</div>
                          )}
                          
                          {/* 🟢 LIBRE para pistas disponibles */}
                          {court.status === 'available' && (
                            <div className="text-green-600 font-semibold text-[9px] leading-none mt-0.5">LIBRE</div>
                          )}
                          
                          {/* Tooltip */}
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                            Pista {court.courtNumber}: {statusText}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <span className="text-xs text-gray-500">Cargando disponibilidad...</span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Confirm Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Reserva</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas unirte a esta partida?
              <br /><br />
              <strong>Tipo:</strong> {matchGame.isOpen ? 'Abierta' : `${matchGame.level} - ${matchGame.genderCategory}`}
              <br />
              <strong>Fecha:</strong> {format(new Date(matchGame.start), "d 'de' MMMM 'a las' HH:mm", { locale: es })}
              <br />
              <strong>Duración:</strong> {matchGame.duration} minutos
              <br />
              <strong>Precio:</strong> €{roundPrice(matchGame.pricePerPlayer).toFixed(2)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleBook} className="bg-purple-600 hover:bg-purple-700">
              {booking ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar Reserva'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 🆕 Partial Transfer Dialog - Para cesión parcial de plazas */}
      <AlertDialog open={showPartialTransferDialog} onOpenChange={setShowPartialTransferDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>♻️ Ceder Plazas de Partida</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const userBookingsCount = getUserBookingsCount();
                const isPrivate = isPrivateBooking;
                const maxSlots = isPrivate ? 4 : userBookingsCount;
                
                return (
                  <>
                    {isPrivate ? (
                      <>
                        Tienes una <strong>reserva privada de pista completa</strong> (4 plazas) en esta partida.
                        <br />
                        Selecciona cuántas plazas deseas ceder. Recibirás puntos de compensación por cada plaza cedida.
                      </>
                    ) : (
                      <>
                        Tienes {userBookingsCount} plaza{userBookingsCount > 1 ? 's' : ''} confirmada{userBookingsCount > 1 ? 's' : ''} en esta partida.
                        <br />
                        Selecciona cuántas plazas deseas ceder. Recibirás puntos de compensación por cada plaza cedida.
                      </>
                    )}
                    <br /><br />
                    <span className="text-sm text-gray-600">
                      ♻️ Las plazas cedidas quedarán disponibles para que otros jugadores las reserven usando puntos.
                    </span>
                  </>
                );
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {/* Grid de opciones de plazas a ceder */}
          <div className="grid grid-cols-2 gap-3 my-4">
            {[1, 2, 3, 4].slice(0, isPrivateBooking ? 4 : getUserBookingsCount()).map((count) => {
              // Para reservas privadas, calcular precio por plaza (courtRentalPrice / 4)
              // Para bookings individuales, usar pricePerPlayer
              const pricePerSlot = isPrivateBooking 
                ? (Number(matchGame.courtRentalPrice) || 0) / 4
                : Number(matchGame.pricePerPlayer) || 0;
              
              const pointsForOption = Math.round(pricePerSlot * count);
              
              return (
                <button
                  key={count}
                  onClick={() => setSlotsToTransfer(count)}
                  className={cn(
                    "p-4 rounded-lg border-2 transition-all hover:scale-105",
                    slotsToTransfer === count
                      ? "border-yellow-600 bg-yellow-50"
                      : "border-gray-300 bg-white hover:border-yellow-400"
                  )}
                >
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {count}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      plaza{count > 1 ? 's' : ''}
                    </div>
                    <div className="text-xs text-yellow-600 font-semibold mt-2">
                      +{pointsForOption} pts
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => handlePartialTransfer(slotsToTransfer)} 
              className="bg-yellow-600 hover:bg-yellow-700"
              disabled={booking}
            >
              {booking ? <Loader2 className="w-4 h-4 animate-spin" /> : `Ceder ${slotsToTransfer} Plaza${slotsToTransfer > 1 ? 's' : ''}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Leave Dialog */}
      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {userBooking?.status === 'CONFIRMED' ? '♻️ Ceder Plaza' : 'Cancelar Inscripción'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const isConfirmed = userBooking?.status === 'CONFIRMED';
                
                if (isConfirmed) {
                  // Partida confirmada → Cesión de plaza
                  return (
                    <>
                      <strong className="text-green-600">✅ Tu partida está confirmada con pista asignada.</strong>
                      <br /><br />
                      Al ceder tu plaza:
                      <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li>Recibirás <strong>1 punto por cada euro</strong> pagado como compensación</li>
                        <li>Tu plaza quedará <strong className="text-yellow-600">disponible (solo con puntos)</strong> para otros jugadores</li>
                        <li>La partida <strong>mantendrá la pista asignada</strong></li>
                        <li>Los demás jugadores seguirán confirmados</li>
                      </ul>
                      <br />
                      <span className="text-sm text-gray-600">
                        ♻️ Este sistema permite que otro jugador pueda aprovechar tu plaza usando solo puntos.
                      </span>
                    </>
                  );
                }
                
                // Inscripción pendiente → Cancelación simple
                return (
                  <>
                    Tu inscripción está <strong>pendiente de confirmación</strong>.
                    <br /><br />
                    Al cancelar:
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                      <li>Se te <strong>desbloquearán</strong> los créditos o puntos reservados</li>
                      <li>Tu plaza quedará libre para nuevos jugadores</li>
                    </ul>
                  </>
                );
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction onClick={handleLeave} className={userBooking?.status === 'CONFIRMED' ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-red-600 hover:bg-red-700'}>
              {booking ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                userBooking?.status === 'CONFIRMED' ? '♻️ Ceder Plaza' : 'Sí, Cancelar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default MatchGameCard;
