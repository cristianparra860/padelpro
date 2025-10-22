// src/components/class/ClassCardReal.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, Users, Euro, Star, X, Users2, Venus, Mars, Lightbulb, Info, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { User, TimeSlot } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface ClassCardRealProps {
  classData: TimeSlot;
  currentUser: User | null;
  onBookingSuccess: () => void;
  showPointsBonus?: boolean;
  allowedPlayerCounts?: number[]; // Números de jugadores permitidos para mostrar
}

interface Booking {
  userId: string;
  groupSize: number;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  name?: string; // Opcional
  profilePictureUrl?: string;
  userLevel?: string;
  userGender?: string;
  createdAt?: string;
}

const ClassCardReal: React.FC<ClassCardRealProps> = ({
  classData,
  currentUser,
  onBookingSuccess,
  showPointsBonus = true,
  allowedPlayerCounts = [1, 2, 3, 4] // Por defecto, permitir todas las opciones
}) => {
  const { toast } = useToast();
  // Usar bookings que ya vienen en classData en lugar de cargarlos
  const [bookings, setBookings] = useState<Booking[]>(
    Array.isArray((classData as any).bookings) ? (classData as any).bookings : 
    Array.isArray(classData.bookedPlayers) ? classData.bookedPlayers : []
  );
  const [loading, setLoading] = useState(false); // Ya no necesitamos loading inicial
  const [booking, setBooking] = useState(false);

  // Sincronizar bookings cuando classData cambie
  useEffect(() => {
    // Priorizar classData.bookings si existe (viene de la API)
    const bookingsData = (classData as any).bookings || classData.bookedPlayers;
    console.log('🔄 useEffect - classData completo:', classData);
    console.log('🔄 useEffect - bookingsData:', bookingsData);
    if (Array.isArray(bookingsData)) {
      console.log('📋 Usando bookings de classData:', bookingsData.length);
      if (bookingsData.length > 0) {
        console.log('🖼️ Primer booking completo:', JSON.stringify(bookingsData[0], null, 2));
        console.log('📸 profilePictureUrl del primer booking:', bookingsData[0].profilePictureUrl);
      }
      setBookings(bookingsData);
    } else {
      console.warn('⚠️ bookingsData NO es un array:', bookingsData, typeof bookingsData);
    }
  }, [(classData as any).bookings, classData.bookedPlayers]);

  const handleBook = async (groupSize: number) => {
    console.log('🔍 Current User completo:', currentUser);
    
    if (!currentUser) {
      toast({
        title: "Error",
        description: "Debes iniciar sesión para reservar",
        variant: "destructive"
      });
      return;
    }
    
    console.log('🆔 User ID que se va a enviar:', currentUser.id);
    console.log('📋 Tipo de currentUser.id:', typeof currentUser.id);
    
    setBooking(true);
    try {
      console.log('📝 Enviando booking:', { 
        userId: currentUser.id, 
        timeSlotId: classData.id, 
        groupSize 
      });
      
      const response = await fetch('/api/classes/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId: currentUser.id,
          timeSlotId: classData.id,
          groupSize
        })
      });

      if (response.ok) {
        toast({
          title: "¡Reserva realizada!",
          description: `Has reservado una plaza para ${groupSize} jugador${groupSize > 1 ? 'es' : ''}.`,
          className: "bg-green-600 text-white"
        });
        onBookingSuccess(); // Recargar lista completa desde el padre
      } else {
        const error = await response.json();
        
        // Mensaje especial para saldo insuficiente
        if (error.error?.includes('Saldo insuficiente') || error.details) {
          toast({
            title: "💰 Saldo Insuficiente",
            description: error.details || error.error || "No tienes saldo suficiente para esta reserva",
            variant: "destructive",
            duration: 5000
          });
        } else {
          toast({
            title: "Error en la reserva",
            description: error.error || "No se pudo completar la reserva",
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      toast({
        title: "Error de conexión",
        description: "No se pudo conectar con el servidor",
        variant: "destructive"
      });
    } finally {
      setBooking(false);
    }
  };

  const handleCancel = async (userId: string) => {
    try {
      const response = await fetch('/api/classes/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId: 'user-alex-test',
          timeSlotId: classData.id,
        })
      });

      if (response.ok) {
        toast({
          title: "¡Reserva cancelada!",
          description: "Tu reserva ha sido cancelada exitosamente.",
          className: "bg-orange-600 text-white"
        });
        onBookingSuccess(); // Recargar lista completa desde el padre
      } else {
        toast({
          title: "Error al cancelar",
          description: "No se pudo cancelar la reserva",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error de conexión",
        description: "No se pudo conectar con el servidor",
        variant: "destructive"
      });
    }
  };

  const getAvailableSpots = (groupSize: number) => {
    if (!Array.isArray(bookings)) return groupSize;
    // Contar cuántos usuarios han reservado específicamente para este groupSize
    const modalityBookedUsers = bookings.filter(b => 
      b.status !== 'CANCELLED' && b.groupSize === groupSize
    ).length;
    return Math.max(0, groupSize - modalityBookedUsers);
  };

  const isUserBooked = (groupSize: number) => {
    if (!Array.isArray(bookings) || !currentUser?.id) return false;
    // Verificar si el usuario actual tiene una reserva específica para este groupSize
    return bookings.some(b => 
      b.status !== 'CANCELLED' && 
      b.userId === currentUser.id && 
      b.groupSize === groupSize
    );
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Función para formatear hora de manera consistente (evita problemas de hidratación)
  const formatTime = (date: Date | string) => {
    try {
      // Si es string, convertir a Date
      const dateObj = date instanceof Date ? date : new Date(date);
      
      // Validar que es un Date válido
      if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
        console.warn('⚠️ Invalid date in formatTime:', date);
        return '00:00';
      }
      
      const hours = dateObj.getHours().toString().padStart(2, '0');
      const minutes = dateObj.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    } catch (error) {
      console.error('❌ Error in formatTime:', error, 'for date:', date);
      return '00:00';
    }
  };

  const renderStarsDisplay = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star 
          key={i} 
          className={`h-3.5 w-3.5 ${i <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
        />
      );
    }
    return (
      <div className="flex items-center">
        {stars} 
        <span className="ml-1.5 text-sm text-gray-600 font-medium">({rating.toFixed(1)})</span>
      </div>
    );
  };

  const getLevelColor = (level: string | undefined) => {
    const colors: Record<string, string> = {
      'principiante': 'text-green-700 border-green-200 bg-green-100',
      'intermedio': 'text-yellow-700 border-yellow-200 bg-yellow-100',
      'avanzado': 'text-orange-700 border-orange-200 bg-orange-100',
      'competicion': 'text-red-700 border-red-200 bg-red-100',
    };
    return colors[level?.toLowerCase() || ''] || 'text-gray-700 border-gray-200 bg-gray-100';
  };

  const getCategoryIcon = (category: string | undefined) => {
    if (category === 'femenina') return Venus;
    if (category === 'masculina') return Mars;
    return Users2;
  };

  const getCategoryColor = (category: string | undefined) => {
    const colors: Record<string, string> = {
      'femenina': 'text-pink-700 border-pink-200 bg-pink-100',
      'masculina': 'text-blue-700 border-blue-200 bg-blue-100',
      'abierta': 'text-purple-700 border-purple-200 bg-purple-100',
    };
    return colors[category?.toLowerCase() || ''] || 'text-gray-700 border-gray-200 bg-gray-100';
  };

  const pricePerPerson = (classData.totalPrice || 35) / 4;
  const instructorRating = 4.8; // Mock rating
  const CategoryIcon = getCategoryIcon(classData.category);

  if (loading) {
    return (
      <Card className="w-full max-w-sm h-96">
        <div className="animate-pulse space-y-4 p-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </Card>
    );
  }

  // Protección adicional para datos inválidos
  if (!classData?.id || !classData?.instructorName) {
    return (
      <Card className="w-full max-w-sm h-96">
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-500">Datos no disponibles</div>
        </div>
      </Card>
    );
  }

  // Determinar si alguna modalidad está completa y qué pista asignar
  const getCourtAssignment = () => {
    if (!Array.isArray(bookings)) {
      return { isAssigned: false, courtNumber: null };
    }

    // Primero: Si ya tiene courtNumber en la BD, usarlo directamente
    if (classData.courtNumber != null && classData.courtNumber > 0) {
      return { 
        isAssigned: true, 
        courtNumber: classData.courtNumber 
      };
    }

    // Segundo: Verificar cada modalidad (1, 2, 3, 4 jugadores)
    for (const modalitySize of [1, 2, 3, 4]) {
      const modalityBookings = bookings.filter(
        b => b.groupSize === modalitySize && b.status !== 'CANCELLED'
      );
      
      // Si esta modalidad está completa
      if (modalityBookings.length >= modalitySize) {
        // Si hay confirmados, la pista debe estar asignada
        const confirmedBookings = modalityBookings.filter(b => b.status === 'CONFIRMED');
        if (confirmedBookings.length > 0) {
          // IMPORTANTE: Si llegó aquí pero no tiene courtNumber en BD, 
          // significa que hay un problema de sincronización
          // Por ahora retornamos que NO está asignada para que se muestre "sin asignar"
          return { isAssigned: false, courtNumber: null };
        }
      }
    }

    return { isAssigned: false, courtNumber: null };
  };

  const courtAssignment = getCourtAssignment();

  // Determinar categoría dinámica basada en el primer usuario inscrito
  const getDynamicCategory = () => {
    // PRIMERO: Verificar si el TimeSlot ya tiene una categoría asignada (de la BD)
    if (classData.genderCategory && classData.genderCategory !== 'mixto') {
      const genderMapping: Record<string, string> = {
        'femenino': 'Chica',
        'masculino': 'Chico',
        'mujer': 'Chica',
        'hombre': 'Chico'
      };
      const category = genderMapping[classData.genderCategory.toLowerCase()] || 'Mixto';
      return { category, isAssigned: true };
    }

    // SEGUNDO: Si no hay categoría en el TimeSlot, calcular de las bookings
    if (!Array.isArray(bookings) || bookings.length === 0) {
      return { category: 'Abierta', isAssigned: false };
    }

    // Buscar el primer usuario inscrito (ordenado por fecha de creación)
    const sortedBookings = [...bookings].sort((a, b) => 
      new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
    );
    
    const firstUser = sortedBookings[0];
    if (firstUser?.userGender) {
      // Mapear diferentes tipos de género a la categoría mostrada
      const genderMapping: Record<string, string> = {
        'chica': 'Chica',
        'chico': 'Chico', 
        'femenino': 'Chica',
        'masculino': 'Chico',
        'mujer': 'Chica',
        'hombre': 'Chico'
      };
      
      const gender = firstUser.userGender.toLowerCase();
      const category = genderMapping[gender] || 'Mixto';
      
      return { category, isAssigned: true };
    }

    return { category: 'Abierta', isAssigned: false };
  };

  // Determinar nivel dinámico basado en el primer usuario inscrito  
  const getDynamicLevel = (): { level: string; isAssigned: boolean } => {
    if (!Array.isArray(bookings) || bookings.length === 0) {
      return { level: 'Abierto', isAssigned: false };
    }

    // Buscar el primer usuario inscrito
    const sortedBookings = [...bookings].sort((a, b) => 
      new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
    );
    
    const firstUser = sortedBookings[0];
    if (firstUser?.userLevel) {
      // Mapear nivel de usuario a rango de nivel con rangos numéricos
      const levelRanges: Record<string, string> = {
        'principiante': '1.0 - 2.5',
        'inicial-medio': '2.0 - 3.5', 
        'intermedio': '3.0 - 4.5',
        'avanzado': '4.0 - 5.5',
        'profesional': '5.0 - 6.0',
        'abierto': 'Abierto'
      };
      
      const userLevel = firstUser.userLevel.toLowerCase();
      const levelRange = levelRanges[userLevel] || firstUser.userLevel;
      
      return { level: levelRange, isAssigned: true };
    }

    return { level: 'Abierto', isAssigned: false };
  };

  const categoryInfo = getDynamicCategory();
  const levelInfo = getDynamicLevel();

  return (
    <div className="bg-white rounded-2xl shadow-[0_8px_16px_rgba(0,0,0,0.3)] border border-gray-100 overflow-hidden w-full max-w-[380px] min-w-[320px] mx-auto">
      {/* Header with Instructor Info */}
      <div className="px-3 pt-2 pb-1">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* Instructor Avatar */}
            <div className="w-14 h-14 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center flex-shrink-0">
              {classData.instructorProfilePicture ? (
                <img 
                  src={classData.instructorProfilePicture}
                  alt={classData.instructorName || 'Instructor'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-base">
                  {(classData.instructorName || 'I').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            
            {/* Instructor Name and Rating */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2 break-words">
                {classData.instructorName || 'Carlos Santana'}
              </h3>
              <div className="flex items-center gap-1 mt-0.5">
                {/* Stars */}
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg key={star} className="w-2.5 h-2.5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                    </svg>
                  ))}
                </div>
                <span className="text-xs text-gray-600 ml-1">(4.5)</span>
              </div>
            </div>
          </div>
          
          {/* Reserve Button */}
          <button 
            className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg font-medium text-xs transition-colors shadow-lg flex items-center gap-2"
            onClick={() => handleBook(4)}
          >
            <span className="text-lg">+</span>
            <div className="flex flex-col items-start leading-tight">
              <span>Reserva</span>
              <span>privada</span>
            </div>
          </button>
        </div>
        
        {/* Class Info */}
        <div className="grid grid-cols-3 gap-2 text-center text-sm text-gray-600 border-b border-gray-100 pb-1.5">
          <div>
            <div className="font-medium text-gray-900 text-xs">Nivel</div>
            <div 
              className={`capitalize px-2 py-1.5 rounded-full text-xs font-medium shadow-[inset_0_4px_8px_rgba(0,0,0,0.3)] ${
                levelInfo.isAssigned 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-600'
              }`}
            >
              {levelInfo.level}
            </div>
          </div>
          <div>
            <div className="font-medium text-gray-900 text-xs">Cat.</div>
            <div 
              className={`capitalize px-2 py-1.5 rounded-full text-xs font-medium shadow-[inset_0_4px_8px_rgba(0,0,0,0.3)] ${
                categoryInfo.isAssigned 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-600'
              }`}
            >
              {categoryInfo.category}
            </div>
          </div>
          <div>
            <div className="font-medium text-gray-900 text-xs">Pista</div>
            <div 
              className={`px-2 py-1.5 rounded-full text-xs font-medium shadow-[inset_0_4px_8px_rgba(0,0,0,0.3)] ${
                courtAssignment.isAssigned 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-600'
              }`}
            >
              {courtAssignment.isAssigned 
                ? `Pista ${courtAssignment.courtNumber}` 
                : 'Pista'
              }
            </div>
          </div>
        </div>
      </div>

      {/* Time and Duration */}
      <div className="px-3 py-2">
        <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
          <div className="flex items-center justify-between">
            {/* Fecha - Izquierda */}
            <div className="flex items-center gap-3">
              {/* Número del día */}
              <div className="text-[2rem] font-black text-gray-900 leading-none min-w-[3rem] text-center">
                {format(classData.startTime, 'dd', { locale: es })}
              </div>
              {/* Día y mes en texto */}
              <div className="flex flex-col justify-center gap-0.5">
                <div className="text-sm font-bold text-gray-900 uppercase tracking-tight leading-none">
                  {format(classData.startTime, 'EEEE', { locale: es })}
                </div>
                <div className="text-xs font-normal text-gray-500 capitalize leading-none">
                  {format(classData.startTime, 'MMMM', { locale: es })}
                </div>
              </div>
            </div>
            
            {/* Hora y duración - Derecha */}
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900 leading-none">
                  {formatTime(classData.startTime)}
                </div>
                <div className="text-xs text-gray-500 flex items-center justify-end gap-1 mt-1">
                  <Clock className="w-3 h-3" />
                  <span>60 min</span>
                </div>
              </div>
              
              <button className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Options */}
      <div className="px-3 py-1.5 space-y-0">
        {[1, 2, 3, 4].filter(players => allowedPlayerCounts.includes(players)).map((players) => {
          // CORRECCIÓN: Solo mostrar reservas que corresponden exactamente a esta modalidad
          const modalityBookings = Array.isArray(bookings) 
            ? bookings.filter(b => b.status !== 'CANCELLED' && b.groupSize === players) 
            : [];
          
          // Debug log para mostrar el filtrado
          if (bookings.length > 0) {
            console.log(`🎯 Clase ${classData.id.substring(0, 8)}: Modalidad ${players} jugadores`);
            console.log(`📋 Todas las reservas:`, bookings.map(b => `${b.name}(${b.groupSize})`));
            console.log(`📋 Reservas filtradas para ${players}:`, modalityBookings.map(b => `${b.name}(${b.groupSize})`));
          }
          
          // Para esta modalidad específica, mostrar solo las reservas que tienen este groupSize
          const bookedUsers = modalityBookings.slice(0, players);
          
          const isUserBookedForOption = isUserBooked(players);
          const pricePerPerson = (classData.totalPrice || 55) / players;
          
          return (
            <div 
              key={players} 
              className="flex items-center justify-between gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded-lg transition-colors"
              onClick={() => handleBook(players)}
            >
              {/* Player Circles */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {Array.from({ length: players }).map((_, index) => {
                  const booking = bookedUsers[index];
                  const isOccupied = !!booking;
                  const isCurrentUser = booking?.userId === currentUser?.id;
                  const displayName = booking?.name ? booking.name.substring(0, 5) : '';
                  
                  // Debug log para ver los datos del booking
                  if (isOccupied && index === 0) {
                    console.log('🖼️ Booking completo:', booking);
                    console.log('📸 profilePictureUrl:', booking.profilePictureUrl);
                  }
                  
                  return (
                    <div key={index} className="flex flex-col items-center gap-1">
                      <div
                        className={`w-12 h-12 rounded-full border-2 flex items-center justify-center text-lg font-bold transition-all shadow-[inset_0_4px_8px_rgba(0,0,0,0.3)] ${
                          isOccupied 
                            ? 'border-green-500 bg-white' 
                            : 'border-dashed border-green-400 bg-white text-green-400'
                        } ${isCurrentUser ? 'ring-2 ring-blue-400 ring-offset-1' : ''}`}
                        title={isOccupied ? booking.name : 'Disponible'}
                      >
                        {isOccupied ? (
                          (() => {
                            console.log(`🎨 Renderizando círculo ${index + 1}/${players}:`, {
                              hasProfilePic: !!booking.profilePictureUrl,
                              profilePicUrl: booking.profilePictureUrl,
                              name: booking.name
                            });
                            
                            if (booking.profilePictureUrl) {
                              return (
                                <img 
                                  src={booking.profilePictureUrl} 
                                  alt={booking.name || 'Usuario'}
                                  className="w-full h-full object-cover rounded-full shadow-[inset_0_4px_8px_rgba(0,0,0,0.3)]"
                                  onLoad={() => console.log('✅ Imagen cargada:', booking.profilePictureUrl)}
                                  onError={(e) => {
                                    console.error('❌ Error cargando imagen:', booking.profilePictureUrl);
                                    // Fallback a iniciales si la imagen falla
                                    const target = e.currentTarget;
                                    const parent = target.parentElement;
                                    if (parent) {
                                      parent.innerHTML = `<div class="w-full h-full rounded-full bg-green-400 flex items-center justify-center shadow-[inset_0_4px_8px_rgba(0,0,0,0.3)]"><span class="text-white text-sm font-bold">${getInitials(booking.name || booking.userId)}</span></div>`;
                                    }
                                  }}
                                />
                              );
                            } else {
                              return (
                                <div className="w-full h-full rounded-full bg-green-400 flex items-center justify-center shadow-[inset_0_4px_8px_rgba(0,0,0,0.3)]">
                                  <span className="text-white text-sm font-bold">
                                    {getInitials(booking.name || booking.userId)}
                                  </span>
                                </div>
                              );
                            }
                          })()
                        ) : (
                          '+'
                        )}
                      </div>
                      <span className="text-xs font-medium leading-none">
                        {isOccupied ? (
                          <span className="text-gray-700">{displayName}</span>
                        ) : (
                          <span className="text-green-400">Libre</span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
              
              {/* Price */}
              <div className="text-right flex-shrink-0 ml-auto">
                <div className="text-lg font-bold text-gray-900">
                  € {pricePerPerson.toFixed(2)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Available Courts */}
      <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-100">
        <div className="text-center">
          {courtAssignment.isAssigned ? (
            <>
              <div className="text-xs text-gray-600 mb-1">Pista asignada:</div>
              <div className="flex items-center justify-center gap-1">
                <span className="font-semibold text-gray-900 text-sm">Pista {courtAssignment.courtNumber}</span>
                <div className="w-5 h-3 bg-blue-500 rounded-sm ml-1"></div>
              </div>
            </>
          ) : (
            <>
              <div className="text-xs text-gray-600 mb-1">Esperando jugadores:</div>
              <div className="flex items-center justify-center gap-1">
                <span className="font-semibold text-gray-900 text-sm">Pista sin asignar</span>
                {[1, 2, 3, 4].map((court) => (
                  <div key={court} className="w-5 h-3 bg-gray-300 rounded-sm ml-0.5"></div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClassCardReal;