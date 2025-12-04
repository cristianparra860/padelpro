// src/components/class/ClassCardReal.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, Users, Euro, Star, X, Users2, Venus, Mars, Lightbulb, Info, Plus, Gift, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { User, TimeSlot } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { calculateSlotPrice } from '@/lib/blockedCredits';
import Link from 'next/link';

interface ClassCardRealProps {
  classData: TimeSlot;
  currentUser: User | null;
  onBookingSuccess: (updatedSlot?: TimeSlot) => void; // ✅ Permitir recibir slot actualizado
  showPointsBonus?: boolean;
  allowedPlayerCounts?: number[]; // Números de jugadores permitidos para mostrar
  isInstructor?: boolean; // 🎓 Si el usuario es instructor (pasado desde padre)
  instructorId?: string; // 🎓 ID del instructor para validación
  creditsSlots?: number[]; // 🎁 Slots con puntos (pasado desde padre)
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
  allowedPlayerCounts = [1, 2, 3, 4], // Por defecto, permitir todas las opciones
  isInstructor: isInstructorProp = false, // 🎓 Recibir desde padre
  instructorId: instructorIdProp, // 🎓 ID del instructor
  creditsSlots: creditsSlotsProps = [] // 🎁 Recibir desde padre
}) => {
  const { toast } = useToast();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingGroupSize, setPendingGroupSize] = useState<number>(1);
  const [showPrivateDialog, setShowPrivateDialog] = useState(false);
  const [privateAttendees, setPrivateAttendees] = useState<number>(4);
  
  // 🎓 Estados para edición de creditsSlots (recibidos desde padre, pero mantenemos estado local para updates)
  const [creditsSlots, setCreditsSlots] = useState<number[]>(creditsSlotsProps);
  const [loadingSlot, setLoadingSlot] = useState<number | null>(null);
  
  // 🔄 Sincronizar creditsSlots cuando cambien las props
  useEffect(() => {
    console.log(`🔄 ClassCard ${classData.id.substring(0,8)}: Sincronizando creditsSlots`, {
      props: creditsSlotsProps,
      stateActual: creditsSlots
    });
    setCreditsSlots(creditsSlotsProps);
  }, [creditsSlotsProps, classData.id]);
  
  // ✅ Validar que classData tiene los datos mínimos necesarios
  if (!classData || !classData.start || !classData.end) {
    console.error('❌ ClassCardReal: classData inválido:', classData);
    return null; // No renderizar si faltan datos críticos
  }
  
  // 🔄 State local para el slot (permite actualización inmediata tras booking)
  const [currentSlotData, setCurrentSlotData] = useState<TimeSlot>(classData);
  
  // 🐛 DEBUG: Verificar datos recibidos
  useEffect(() => {
    console.log('🔍 ClassCard received data:', {
      id: classData.id,
      start: classData.start,
      startType: typeof classData.start,
      levelRange: (classData as any).levelRange,
      creditsSlots: (classData as any).creditsSlots,
      creditsCost: (classData as any).creditsCost
    });
  }, [classData]);
  
  // 🔄 Actualizar cuando cambie classData desde padre
  useEffect(() => {
    setCurrentSlotData(classData);
  }, [classData]);
  
  // 🔍 Si no hay opciones de jugadores permitidas, no renderizar la tarjeta
  const availableOptions = useMemo(() => {
    return [1, 2, 3, 4].filter(count => allowedPlayerCounts.includes(count));
  }, [allowedPlayerCounts]);
  
  if (availableOptions.length === 0) {
    return null; // Ocultar completamente la tarjeta
  }
  
  // Usar bookings que ya vienen en classData en lugar de cargarlos
  const [bookings, setBookings] = useState<Booking[]>(
    Array.isArray((classData as any).bookings) ? (classData as any).bookings : 
    Array.isArray(currentSlotData.bookedPlayers) ? currentSlotData.bookedPlayers : []
  );
  
  // 🔄 Actualizar bookings cuando cambien las props de classData
  useEffect(() => {
    console.log(`🔄🔄🔄 ClassCard ${classData.id.substring(0,8)}: useEffect TRIGGERED`);
    console.log('📦 classData completo:', {
      id: classData.id,
      hasBookings: 'bookings' in classData,
      bookingsIsArray: Array.isArray((classData as any).bookings),
      bookingsLength: (classData as any).bookings?.length || 0,
      level: (classData as any).level,
      levelRange: (classData as any).levelRange,
      genderCategory: (classData as any).genderCategory,
      timestamp: Date.now()
    });
    
    const newBookings = Array.isArray((classData as any).bookings) ? (classData as any).bookings : 
                       Array.isArray(currentSlotData.bookedPlayers) ? currentSlotData.bookedPlayers : [];
    
    console.log(`   → Nuevos bookings a aplicar:`, {
      cantidad: newBookings.length,
      bookings: newBookings.map(b => ({
        id: b.id,
        name: b.name || b.userName,
        groupSize: b.groupSize
      }))
    });
    
    setBookings(newBookings);
    console.log(`✅ setBookings llamado con ${newBookings.length} bookings`);
  }, [classData, currentSlotData, classData.id]);
  
  // 🎁 Función para toggle de PLAZAS INDIVIDUALES (euros ↔ puntos)
  // Nueva lógica: cada círculo puede ser activado individualmente
  const handleToggleIndividualSlot = async (players: number, circleIndex: number, event: React.MouseEvent) => {
    console.log('🔥 handleToggleIndividualSlot CALLED', { players, circleIndex });
    event.stopPropagation();
    event.preventDefault();
    
    if (!isInstructorProp || !instructorIdProp) {
      console.log('❌ No es instructor o falta instructorId', { isInstructorProp, instructorIdProp });
      return;
    }
    
    // Calcular índice absoluto basado en modalidad y posición del círculo
    // Modalidad 1: círculo 0 → índice 0
    // Modalidad 2: círculos 0,1 → índices 1,2  
    // Modalidad 3: círculos 0,1,2 → índices 3,4,5
    // Modalidad 4: círculos 0,1,2,3 → índices 6,7,8,9
    const startIndex = [1,2,3,4].slice(0, players - 1).reduce((sum, p) => sum + p, 0);
    const absoluteIndex = startIndex + circleIndex;
    
    setLoadingSlot(absoluteIndex);
    
    try {
      const isCurrentlyCreditsSlot = creditsSlots.includes(absoluteIndex);
      const action = isCurrentlyCreditsSlot ? 'remove' : 'add';

      // Calcular el precio por persona de esta modalidad (en euros = puntos)
      const totalPrice = classData.totalPrice || 25;
      const pricePerPerson = Math.ceil(totalPrice / players); // Redondear hacia arriba
      
      console.log(`🎁 Toggle plaza individual:`, {
        modalidad: players,
        circuloEnModalidad: circleIndex,
        indiceAbsoluto: absoluteIndex,
        accion: action,
        precioTotal: totalPrice,
        precioPorPersona: pricePerPerson,
        currentCreditsSlots: creditsSlots
      });

      const response = await fetch(`/api/timeslots/${classData.id}/credits-slots`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          slotIndex: absoluteIndex, 
          action, 
          creditsCost: pricePerPerson, // Usar precio por persona
          instructorId: instructorIdProp
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al actualizar plaza');
      }

      // Actualizar estado local
      const newCreditsSlots = action === 'add' 
        ? [...creditsSlots, absoluteIndex].sort((a, b) => a - b)
        : creditsSlots.filter(s => s !== absoluteIndex);
      
      setCreditsSlots(newCreditsSlots);

      toast({
        title: action === 'add' ? '🎁 Plaza Individual Activada' : '💰 Plaza Restaurada a Euros',
        description: `Plaza ${circleIndex + 1} de modalidad ${players} jugador${players > 1 ? 'es' : ''}`,
        className: action === 'add' ? 'bg-amber-500 text-white' : 'bg-green-500 text-white'
      });

      onBookingSuccess();

    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo actualizar',
        variant: 'destructive'
      });
    } finally {
      setLoadingSlot(null);
    }
  };
  
  // 🎁 Función para toggle de creditsSlots (euros ↔ puntos)
  const handleToggleCreditsSlot = async (modalitySize: number, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevenir que active el booking
    
    if (!isInstructorProp) return;
    
    setLoadingSlot(modalitySize);
    
    try {
      const isCurrentlyCreditsSlot = creditsSlots.includes(modalitySize);
      const action = isCurrentlyCreditsSlot ? 'remove' : 'add';

      const response = await fetch(`/api/timeslots/${classData.id}/credits-slots`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          slotIndex: modalitySize, 
          action, 
          creditsCost: 50,
          instructorId: classData.instructorId // 🎓 Enviar ID del instructor de la clase
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al actualizar modalidad');
      }

      // Actualizar estado local INMEDIATAMENTE
      const newCreditsSlots = action === 'add' 
        ? [...creditsSlots, modalitySize].sort((a, b) => a - b)
        : creditsSlots.filter(s => s !== modalitySize);
      
      setCreditsSlots(newCreditsSlots);
      console.log(`🎁 Estado local actualizado para slot ${classData.id.substring(0,8)}:`, newCreditsSlots);

      toast({
        title: action === 'add' ? '🎁 Plaza con Puntos Activada' : '💰 Plaza de Pago Restaurada',
        description: `${modalitySize} jugador${modalitySize > 1 ? 'es' : ''}: ${action === 'add' ? 'Ahora cuesta 50 puntos' : 'Vuelve a pago normal'}`,
        className: action === 'add' ? 'bg-amber-500 text-white' : 'bg-green-500 text-white'
      });

      // Notificar al padre para refrescar datos (esto recargará los creditsSlots desde el servidor)
      console.log(`📞 Llamando onBookingSuccess para recargar creditsSlots...`);
      onBookingSuccess();

    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error desconocido',
        variant: 'destructive'
      });
    } finally {
      setLoadingSlot(null);
    }
  };
  const [loading, setLoading] = useState(false); // Ya no necesitamos loading inicial
  const [booking, setBooking] = useState(false);
  const [hasConfirmedBookingToday, setHasConfirmedBookingToday] = useState(false);
  const [loadingBookingCheck, setLoadingBookingCheck] = useState(true);

  // 🚫 Verificar si el usuario ya tiene una reserva confirmada este día
  useEffect(() => {
    const checkConfirmedBookingToday = async () => {
      if (!currentUser?.id || !currentSlotData?.start) {
        setLoadingBookingCheck(false);
        return;
      }

      try {
        // Obtener fecha de la clase (sin hora)
        const classDate = new Date(currentSlotData.start);
        const dateStr = classDate.toISOString().split('T')[0]; // YYYY-MM-DD

        // Consultar API para verificar reservas confirmadas del usuario ese día
        const response = await fetch(
          `/api/user-bookings?userId=${currentUser.id}&date=${dateStr}&onlyConfirmed=true`,
          { credentials: 'include' }
        );

        if (response.ok) {
          const data = await response.json();
          // Si tiene alguna reserva confirmada (courtId != null) ese día, bloquear
          const hasConfirmed = data.bookings?.some((b: any) => 
            b.timeSlot?.courtId !== null && b.status === 'CONFIRMED'
          );
          setHasConfirmedBookingToday(hasConfirmed);
        }
      } catch (error) {
        console.error('Error verificando reservas confirmadas:', error);
      } finally {
        setLoadingBookingCheck(false);
      }
    };

    checkConfirmedBookingToday();
  }, [currentUser?.id, currentSlotData?.start]);

  // Sincronizar currentSlotData cuando classData cambie desde el padre
  useEffect(() => {
    setCurrentSlotData(classData);
  }, [classData]);

  // Sincronizar bookings cuando classData o currentSlotData cambien
  useEffect(() => {
    // Priorizar currentSlotData.bookings (actualizado tras booking local)
    const bookingsData = (currentSlotData as any).bookings || 
                         currentSlotData.bookedPlayers || 
                         (classData as any).bookings || 
                         classData.bookedPlayers;
    
    // Verificar que bookingsData existe y es un array
    if (bookingsData && Array.isArray(bookingsData)) {
      setBookings(bookingsData);
    } else {
      setBookings([]); // Establecer array vacío por defecto
    }
  }, [currentSlotData, classData]); // Depender de ambos objetos completos

  const handleBookClick = (groupSize: number) => {
    console.log('🎯 handleBookClick llamado con groupSize:', groupSize);
    
    if (!currentUser) {
      toast({
        title: "Error",
        description: "Debes iniciar sesión para reservar",
        variant: "destructive"
      });
      return;
    }

    // 🚫 BLOQUEO: Verificar si ya tiene una reserva confirmada ese día
    if (hasConfirmedBookingToday) {
      toast({
        title: "❌ Reserva bloqueada",
        description: "Ya tienes una reserva confirmada para este día. Solo puedes tener una reserva confirmada por día.",
        variant: "destructive",
        duration: 5000
      });
      return;
    }
    
    // Mostrar diálogo de confirmación
    setPendingGroupSize(groupSize);
    setShowConfirmDialog(true);
  };

  const handlePrivateBooking = async () => {
    if (!currentUser) {
      toast({
        title: "Inicia sesión",
        description: "Debes iniciar sesión para reservar",
        variant: "destructive"
      });
      return;
    }

    if (hasConfirmedBookingToday) {
      toast({
        title: "❌ Reserva bloqueada",
        description: "Ya tienes una reserva confirmada para este día. Solo puedes tener una reserva confirmada por día.",
        variant: "destructive",
        duration: 5000
      });
      return;
    }

    setShowPrivateDialog(false);
    setIsBooking(true);

    try {
      const response = await fetch('/api/classes/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timeSlotId: currentSlotData.id,
          userId: currentUser.id,
          groupSize: privateAttendees,
          isPrivate: true // Marcador de reserva privada
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 402) {
          toast({
            title: "Saldo insuficiente",
            description: data.details || data.error || "No tienes saldo suficiente para esta reserva",
            variant: "destructive",
            duration: 5000
          });
        } else {
          toast({
            title: "Error en la reserva",
            description: data.error || "No se pudo completar la reserva",
            variant: "destructive"
          });
        }
        return;
      }

      toast({
        title: "¡Reserva privada realizada!",
        description: `Has reservado la clase completa para ${privateAttendees} persona${privateAttendees > 1 ? 's' : ''}. Pista asignada.`,
        duration: 5000
      });

      if (data.updatedSlot) {
        onBookingSuccess(data.updatedSlot);
      } else {
        onBookingSuccess();
      }

      window.dispatchEvent(new CustomEvent('bookingUpdate', { 
        detail: { timeSlotId: currentSlotData.id, action: 'book' } 
      }));

    } catch (error) {
      console.error('Error al realizar reserva privada:', error);
      toast({
        title: "Error",
        description: "Ocurrió un error al procesar la reserva privada",
        variant: "destructive"
      });
    } finally {
      setIsBooking(false);
    }
  };

  const handleBook = async () => {
    const groupSize = pendingGroupSize;
    console.log('🎯 handleBook confirmado con groupSize:', groupSize);
    
    setShowConfirmDialog(false);
    console.log('🆔 User ID que se va a enviar:', currentUser?.id);
    console.log('📋 Tipo de currentUser.id:', typeof currentUser?.id);
    
    // 🎁 VERIFICAR SI ES UNA PLAZA CON PUNTOS (creditsSlot)
    // Calcular creditsCost basado en el precio por persona de la modalidad
    const totalPrice = currentSlotData.totalPrice || 25;
    const creditsCost = Math.ceil(totalPrice / groupSize); // Precio en puntos = precio en euros
    
    // Calcular índices para esta modalidad
    const startIndex = [1,2,3,4].slice(0, groupSize - 1).reduce((sum, p) => sum + p, 0);
    const endIndex = startIndex + groupSize;
    
    // Filtrar las reservas de esta modalidad
    const modalityBookings = bookings.filter(b => b.groupSize === groupSize);
    
    // Verificar qué plazas están ocupadas y cuál sería la siguiente disponible
    let nextAvailableIndex = -1;
    for (let i = 0; i < groupSize; i++) {
      const absoluteIndex = startIndex + i;
      const isOccupied = modalityBookings[i] && 
                        modalityBookings[i].status !== 'CANCELLED';
      
      if (!isOccupied) {
        nextAvailableIndex = absoluteIndex;
        break;
      }
    }
    
    console.log(`🎯 Modalidad ${groupSize}: índices ${startIndex}-${endIndex-1}, próxima plaza disponible: ${nextAvailableIndex}`);
    
    // Verificar si la próxima plaza disponible es una creditsSlot
    const isCreditsSlot = nextAvailableIndex >= 0 && 
                         Array.isArray(creditsSlots) && 
                         creditsSlots.includes(nextAvailableIndex);
    
    console.log(`🎁 ¿Es creditsSlot? ${isCreditsSlot} (índice ${nextAvailableIndex} en array [${creditsSlots.join(', ')}])`);
    
    let usePoints = false;
    
    if (isCreditsSlot) {
      // 🎁 Esta plaza es reservable con puntos - verificar que el usuario tenga suficientes
      const userPoints = (currentUser as any).points || 0;
      
      console.log(`🎁 Plaza con puntos detectada. Puntos usuario: ${userPoints}, Requeridos: ${creditsCost}`);
      
      if (userPoints >= creditsCost) {
        // Usuario tiene suficientes puntos - usar automáticamente
        usePoints = true;
        console.log('✅ Usuario tiene suficientes puntos - Se usarán automáticamente');
        
        // Mostrar confirmación al usuario
        toast({
          title: "🎁 Reserva con Puntos",
          description: `Se usarán ${creditsCost} puntos para esta reserva (tienes ${userPoints}).`,
          variant: "default",
          duration: 3000
        });
      } else {
        // No tiene suficientes puntos - no permitir reserva
        toast({
          title: "❌ Puntos Insuficientes",
          description: `Esta plaza requiere ${creditsCost} puntos pero solo tienes ${userPoints}. No puedes reservar con créditos normales.`,
          variant: "destructive",
          duration: 5000
        });
        return; // 🚫 No continuar con la reserva
      }
    }
    
    // ♻️ VERIFICAR SI HAY PLAZAS RECICLADAS EN ESTA OPCIÓN (solo si no es credits slot)
    if (!isCreditsSlot) {
      const hasRecycledInOption = bookings.some(b => 
        b.groupSize === groupSize && 
        b.status === 'CANCELLED' && 
        b.isRecycled === true
      );
      
      if (hasRecycledInOption) {
        // ♻️ Hay plazas recicladas - preguntar al usuario si quiere usar puntos
        const userPoints = (currentUser as any).points || 0;
        const pricePerSlot = ((currentSlotData.totalPrice || 25) / groupSize);
        const pointsRequired = Math.floor(pricePerSlot);
        
        console.log(`♻️ Plaza reciclada detectada. Puntos usuario: ${userPoints}, Requeridos: ${pointsRequired}`);
        
        if (userPoints >= pointsRequired) {
          // Usuario tiene suficientes puntos - preguntar si quiere usarlos
          const wantsToUsePoints = window.confirm(
            `♻️ Esta clase tiene plazas recicladas.\n\n` +
            `Puedes reservar con puntos:\n` +
            `💎 Puntos requeridos: ${pointsRequired}\n` +
            `💎 Tus puntos: ${userPoints}\n\n` +
            `¿Deseas usar puntos para reservar?`
          );
          
          if (wantsToUsePoints) {
            usePoints = true;
            console.log('✅ Usuario eligió pagar con puntos');
          } else {
            console.log('❌ Usuario eligió pagar con créditos normales');
          }
        } else {
          // No tiene suficientes puntos - informar y continuar con créditos
          toast({
            title: "♻️ Plaza Reciclada",
            description: `Esta plaza requiere ${pointsRequired} puntos para reservar (tienes ${userPoints}). Se usarán tus créditos normales.`,
            variant: "default",
            duration: 4000
          });
        }
      }
    }
    
    setBooking(true);
    try {
      console.log('📝 Enviando booking:', { 
        userId: currentUser.id, 
        timeSlotId: currentSlotData.id, 
        groupSize,
        usePoints 
      });
      
      const response = await fetch('/api/classes/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId: currentUser.id,
          timeSlotId: currentSlotData.id,
          groupSize,
          usePoints // 💰 Enviar flag de pago con puntos
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        console.log('🎉 ========================================');
        console.log('🎉 BOOKING EXITOSO');
        console.log('📦 Respuesta del API:', {
          success: result.success,
          hasUpdatedSlot: !!result.updatedSlot,
          bookingsInUpdatedSlot: result.updatedSlot?.bookings?.length || 0
        });
        
        // ✅ Si la API devolvió el slot actualizado, usarlo para actualización inmediata
        if (result.updatedSlot) {
          console.log('✅ Slot actualizado recibido del API');
          console.log('📋 Bookings en updatedSlot:', result.updatedSlot.bookings?.length || 0);
          
          if (result.updatedSlot.bookings && result.updatedSlot.bookings.length > 0) {
            console.log('👤 Primer booking en respuesta:', {
              id: result.updatedSlot.bookings[0].id,
              name: result.updatedSlot.bookings[0].name || result.updatedSlot.bookings[0].userName,
              userLevel: result.updatedSlot.bookings[0].userLevel,
              profilePictureUrl: result.updatedSlot.bookings[0].profilePictureUrl ? 'SÍ (tiene)' : 'NO'
            });
          }
          
          // Convertir el slot del API al formato TimeSlot
          const updatedSlot: TimeSlot = {
            ...result.updatedSlot,
            start: result.updatedSlot.start,
            end: result.updatedSlot.end,
            level: result.updatedSlot.level || 'abierto', // ✅ PRESERVAR nivel del API
            levelRange: result.updatedSlot.levelRange || null, // ✅ PRESERVAR levelRange
            genderCategory: result.updatedSlot.genderCategory || null, // ✅ PRESERVAR genderCategory
            bookedPlayers: result.updatedSlot.bookings || [],
            bookings: result.updatedSlot.bookings || []
          };
          
          console.log('📦 Slot convertido para el padre:', {
            id: updatedSlot.id,
            level: updatedSlot.level,
            levelRange: updatedSlot.levelRange,
            genderCategory: updatedSlot.genderCategory,
            bookings: updatedSlot.bookings?.length || 0
          });
          
          // ✅ Actualizar bookings inmediatamente en el estado local
          if (result.updatedSlot.bookings && Array.isArray(result.updatedSlot.bookings)) {
            console.log('✅ Actualizando bookings localmente:', result.updatedSlot.bookings.length);
            setBookings(result.updatedSlot.bookings);
          }
          
          // Actualizar estado local del slot
          setCurrentSlotData(updatedSlot);
          
          console.log('📞 Llamando onBookingSuccess(updatedSlot)...');
          // Notificar al padre con el slot actualizado
          onBookingSuccess(updatedSlot);
          console.log('🎉 ========================================');
        } else {
          console.log('⚠️ API no devolvió updatedSlot, usando fallback');
          // Fallback: recargar desde padre si no viene updatedSlot
          setTimeout(() => {
            onBookingSuccess();
          }, 100);
        }
        
        toast({
          title: "¡Reserva realizada!",
          description: `Has reservado una plaza para ${groupSize} jugador${groupSize > 1 ? 'es' : ''}.`,
          className: "bg-green-600 text-white"
        });
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
          userId: currentUser?.id || userId,
          timeSlotId: currentSlotData.id,
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // 🔄 Notificar a TODAS las páginas abiertas que se canceló una reserva
        localStorage.setItem('bookingCancelled', JSON.stringify({
          timeSlotId: currentSlotData.id,
          userId: currentUser?.id || userId,
          timestamp: Date.now()
        }));
        
        toast({
          title: "¡Reserva cancelada!",
          description: "Redirigiendo al calendario...",
          className: "bg-orange-600 text-white"
        });
        
        // 🔄 Si estamos en el dashboard, redirigir al calendario CON RECARGA FORZADA
        if (window.location.pathname.includes('/dashboard')) {
          setTimeout(() => {
            // Usar replace para forzar recarga completa sin caché
            window.location.replace('/activities?refresh=' + Date.now());
          }, 500);
        } else {
          // Pequeño delay para asegurar que la BD se actualice antes de refrescar
          setTimeout(() => {
            onBookingSuccess(); // Recargar lista completa desde el padre y actualizar calendario
          }, 100);
        }
      } else {
        const errorData = await response.json();
        toast({
          title: "Error al cancelar",
          description: errorData.error || "No se pudo cancelar la reserva",
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
  // Helper para convertir cualquier formato de fecha a Date
  const toDateObject = (date: Date | string | number): Date => {
    // Validar que existe el valor
    if (!date) {
      console.error('⚠️ toDateObject: date is null/undefined, usando fecha del slot');
      // Usar la fecha del slot como fallback
      if (currentSlotData?.start) {
        return toDateObject(currentSlotData.start);
      }
      // Si tampoco hay fecha en el slot, usar fecha actual pero logear error
      console.error('❌ No hay fecha disponible ni en parámetro ni en slot');
      return new Date();
    }
    
    if (date instanceof Date) return date;
    if (typeof date === 'number') return new Date(date);
    
    // Para strings, intentar parsear
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) {
      console.error('⚠️ toDateObject: Invalid date string:', date);
      return new Date();
    }
    
    return parsed;
  };

  const formatTime = (date: Date | string | number) => {
    try {
      const dateObj = toDateObject(date);
      
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

  const pricePerPerson = (currentSlotData.totalPrice || 25) / 4; // Precio en euros
  const instructorRating = 4.8; // Mock rating
  const CategoryIcon = getCategoryIcon(currentSlotData.category);

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
    if (currentSlotData.courtNumber != null && currentSlotData.courtNumber > 0) {
      return { 
        isAssigned: true, 
        courtNumber: currentSlotData.courtNumber 
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
    if (currentSlotData.genderCategory && currentSlotData.genderCategory !== 'mixto') {
      const genderMapping: Record<string, string> = {
        'femenino': 'Chica',
        'masculino': 'Chico',
        'mujer': 'Chica',
        'hombre': 'Chico'
      };
      const category = genderMapping[currentSlotData.genderCategory.toLowerCase()] || 'Mixto';
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

  // Determinar nivel dinámico basado en el levelRange del TimeSlot o el primer usuario inscrito  
  const getDynamicLevel = (): { level: string; isAssigned: boolean } => {
    // 🐛 DEBUG: Log para ver qué datos recibe el componente
    console.log('🔍 getDynamicLevel - Data received:', {
      classDataId: classData.id.substring(0, 12),
      classDataLevel: (classData as any)?.level,
      classDataLevelRange: (classData as any)?.levelRange,
      currentSlotDataLevel: (currentSlotData as any)?.level,
      currentSlotDataLevelRange: (currentSlotData as any)?.levelRange,
      instructorName: classData.instructorName
    });

    // 🎯 PRIORIDAD 1: Usar levelRange del TimeSlot si está definido (usar classData que viene del API)
    const levelRange = (classData as any).levelRange || (currentSlotData as any).levelRange;
    if (levelRange && levelRange !== 'null') {
      console.log('✅ Using levelRange:', levelRange);
      return { 
        level: levelRange, 
        isAssigned: true 
      };
    }

    // 🎯 PRIORIDAD 2: Usar el campo "level" del TimeSlot directamente
    // Este campo ya contiene el rango correcto (ej: "5-7") gracias al backend
    const slotLevel = (classData as any)?.level || (currentSlotData as any)?.level;
    
    if (slotLevel && slotLevel !== 'abierto' && slotLevel !== 'ABIERTO' && slotLevel !== 'null') {
      return { level: slotLevel, isAssigned: true };
    }
    return { level: 'Abierto', isAssigned: false };
  };

  const categoryInfo = getDynamicCategory();
  const levelInfo = getDynamicLevel();

  return (
    <div className="bg-white rounded-2xl shadow-[0_8px_16px_rgba(0,0,0,0.3)] border border-gray-100 overflow-hidden w-full max-w-[304px] min-w-[256px] mx-auto scale-[0.80]">
      {/* Header with Instructor Info */}
      <div className="px-3 pt-2 pb-1">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* Instructor Avatar */}
            <div className="w-14 h-14 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center flex-shrink-0">
              {currentSlotData.instructorProfilePicture ? (
                <img 
                  src={currentSlotData.instructorProfilePicture}
                  alt={currentSlotData.instructorName || 'Instructor'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-base">
                  {(currentSlotData.instructorName || 'I').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            
            {/* Instructor Name and Rating */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2 break-words">
                {currentSlotData.instructorName || 'Carlos Santana'}
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
            className={cn(
              "px-3 py-1.5 rounded-lg font-medium text-xs transition-colors shadow-lg flex items-center gap-2",
              hasConfirmedBookingToday
                ? "bg-gray-400 cursor-not-allowed opacity-50"
                : "bg-purple-600 hover:bg-purple-700 text-white"
            )}
            onClick={() => {
              if (hasConfirmedBookingToday) {
                toast({
                  title: "❌ Reserva bloqueada",
                  description: "Ya tienes una reserva confirmada este día",
                  variant: "destructive",
                  duration: 5000
                });
              } else {
                setShowPrivateDialog(true);
              }
            }}
            disabled={hasConfirmedBookingToday}
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
                {format(toDateObject(currentSlotData.start), 'dd', { locale: es })}
              </div>
              {/* Día y mes en texto */}
              <div className="flex flex-col justify-center gap-0.5">
                <div className="text-sm font-bold text-gray-900 uppercase tracking-tight leading-none">
                  {format(toDateObject(currentSlotData.start), 'EEEE', { locale: es })}
                </div>
                <div className="text-xs font-normal text-gray-500 capitalize leading-none">
                  {format(toDateObject(currentSlotData.start), 'MMMM', { locale: es })}
                </div>
              </div>
            </div>
            
            {/* Hora y duración - Derecha */}
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900 leading-none">
                  {formatTime(currentSlotData.start)}
                </div>
                <div className="text-xs text-gray-500 flex items-center justify-end gap-1 mt-1">
                  <Clock className="w-3 h-3" />
                  <span>60 min</span>
                </div>
              </div>
              
              <button 
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Compartir clase"
                title="Compartir clase"
              >
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
        {/* 🚫 Mensaje de bloqueo si tiene reserva confirmada */}
        {hasConfirmedBookingToday && !loadingBookingCheck && (
          <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-700 text-xs font-medium">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Ya tienes una reserva confirmada este día</span>
            </div>
          </div>
        )}
        
        {[1, 2, 3, 4].filter(players => allowedPlayerCounts.includes(players)).map((players) => {
          // CORRECCIÓN: Solo mostrar reservas que corresponden exactamente a esta modalidad
          const modalityBookings = Array.isArray(bookings) 
            ? bookings.filter(b => b.status !== 'CANCELLED' && b.groupSize === players) 
            : [];
          
          // Verificar si esta modalidad está confirmada (tiene pista asignada)
          const isThisModalityConfirmed = courtAssignment.isAssigned && 
            modalityBookings.length >= players && 
            modalityBookings.some(b => b.status === 'CONFIRMED');
          
          // Verificar si OTRA modalidad está confirmada
          const isAnotherModalityConfirmed = courtAssignment.isAssigned && !isThisModalityConfirmed;
          
          // 🎁 Verificar si esta modalidad es reservable con puntos
          // Calcular creditsCost dinámicamente: precio por persona
          const totalPrice = currentSlotData.totalPrice || 25;
          const creditsCost = Math.ceil(totalPrice / players);
          
          // Calcular cuántas plazas de esta modalidad son de puntos
          const startIndex = [1,2,3,4].slice(0, players - 1).reduce((sum, p) => sum + p, 0);
          const endIndex = startIndex + players;
          const creditsSlotIndicesForThisModality = Array.isArray(creditsSlots) 
            ? creditsSlots.filter(idx => idx >= startIndex && idx < endIndex)
            : [];
          
          const hasAnyCreditSlot = creditsSlotIndicesForThisModality.length > 0;
          const hasAllCreditSlots = creditsSlotIndicesForThisModality.length === players;
          
          // Para retrocompatibilidad (por si hay datos antiguos con modalidades en lugar de índices)
          const isCreditsSlot = Array.isArray(creditsSlots) && 
            (creditsSlots.includes(players) || hasAllCreditSlots);
          
          // 🐛 DEBUG temporal para Cristian Parra slot
          if (currentSlotData.id.includes('z9y4veby1rd')) {
            console.log(`🐛 DEBUG slot ${currentSlotData.id.substring(0, 12)}:`, {
              players,
              creditsSlotsState: creditsSlots,
              isArray: Array.isArray(creditsSlots),
              includes: creditsSlots.includes ? creditsSlots.includes(players) : 'NO includes method',
              isCreditsSlot,
              creditsCost
            });
          }
          
          // Debug log para mostrar el filtrado
          if (bookings.length > 0) {
            console.log(`🎯 Clase ${currentSlotData.id.substring(0, 8)}: Modalidad ${players} jugadores`);
            console.log(`📋 Todas las reservas:`, bookings.map(b => `${b.name}(${b.groupSize})`));
            console.log(`📋 Reservas filtradas para ${players}:`, modalityBookings.map(b => `${b.name}(${b.groupSize})`));
            console.log(`🎁 Es plaza con puntos:`, isCreditsSlot, '- Coste:', creditsCost);
          }
          
          // Para esta modalidad específica, mostrar solo las reservas que tienen este groupSize
          const bookedUsers = modalityBookings.slice(0, players);
          
          const isUserBookedForOption = isUserBooked(players);
          const pricePerPerson = (currentSlotData.totalPrice || 25) / players; // Precio en euros
          
          return (
            <div 
              key={players} 
              className={cn(
                "flex items-center justify-between gap-2 p-1 rounded-lg transition-colors",
                hasConfirmedBookingToday || isAnotherModalityConfirmed 
                  ? "opacity-40 cursor-not-allowed bg-gray-100" 
                  : "cursor-pointer hover:bg-gray-50"
              )}
              onClick={() => {
                if (hasConfirmedBookingToday) {
                  toast({
                    title: "❌ Reserva bloqueada",
                    description: "Ya tienes una reserva confirmada este día. Solo puedes tener una reserva confirmada por día.",
                    variant: "destructive",
                    duration: 5000
                  });
                } else if (!isAnotherModalityConfirmed) {
                  handleBookClick(players);
                } else {
                  toast({
                    title: "Clase Confirmada",
                    description: "Esta clase ya está confirmada con otra modalidad de jugadores",
                    variant: "default"
                  });
                }
              }}
            >
              {/* Player Circles */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {Array.from({ length: players }).map((_, index) => {
                  const booking = bookedUsers[index];
                  const isOccupied = !!booking;
                  const isCurrentUser = booking?.userId === currentUser?.id;
                  const isRecycled = booking?.status === 'CANCELLED' && booking?.isRecycled === true;
                  const displayName = booking?.name ? booking.name.substring(0, 5) : '';
                  
                  // 🎁 NUEVA LÓGICA: Calcular índice absoluto para verificar creditsSlots
                  const startIndex = [1,2,3,4].slice(0, players - 1).reduce((sum, p) => sum + p, 0);
                  const absoluteIndex = startIndex + index;
                  const isThisCircleCredits = Array.isArray(creditsSlots) && creditsSlots.includes(absoluteIndex);
                  
                  // Debug log para ver los datos del booking
                  if (isOccupied && index === 0) {
                    console.log('🖼️ Booking completo:', booking);
                    console.log('📸 profilePictureUrl:', booking.profilePictureUrl);
                    console.log('♻️ isRecycled:', isRecycled);
                  }
                  
                  return (
                    <div key={index} className="flex flex-col items-center gap-1 relative">
                      <div
                        className={cn(
                          "w-12 h-12 rounded-full border-2 flex items-center justify-center text-lg font-bold transition-all shadow-[inset_0_4px_8px_rgba(0,0,0,0.3)]",
                          isRecycled
                            ? 'border-yellow-500 bg-yellow-400 text-yellow-900 recycled-slot-blink' // ♻️ Plaza reciclada
                            : isOccupied 
                              ? (isThisCircleCredits ? 'border-amber-500 bg-white' : 'border-green-500 bg-white')
                              : (isThisCircleCredits 
                                  ? 'border-2 border-amber-500 bg-amber-50 text-amber-600' // 🎁 Plaza vacía con puntos - fondo dorado
                                  : 'border-dashed border-green-400 bg-white text-green-400'),
                          isCurrentUser && 'ring-2 ring-blue-400 ring-offset-1',
                          isAnotherModalityConfirmed && 'grayscale opacity-50',
                          isThisCircleCredits && !isOccupied && 'shadow-[0_0_15px_rgba(245,158,11,0.5)] animate-pulse' // 🎁 Glow dorado pulsante para plazas con puntos
                        )}
                        title={
                          isRecycled
                            ? '♻️ Plaza reciclada - Reservable con puntos'
                            : isThisCircleCredits
                              ? `🎁 Reservable con ${creditsCost} puntos`
                            : isAnotherModalityConfirmed 
                              ? 'Opción bloqueada - Otra modalidad confirmada'
                              : isOccupied ? booking.name : 'Disponible'
                        }
                      >
                      
                      {/* 🎓 Botón de edición para instructores (AHORA EN CADA CÍRCULO VACÍO) */}
                      {isInstructorProp && !isOccupied && !isAnotherModalityConfirmed && (
                        <button
                          onClick={(e) => {
                            console.log('🔥 Botón clicked!', { players, index, absoluteIndex });
                            handleToggleIndividualSlot(players, index, e);
                          }}
                          disabled={loadingSlot === absoluteIndex}
                          className={cn(
                            "absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md z-10 transition-all",
                            loadingSlot === absoluteIndex ? "bg-gray-400" : isThisCircleCredits 
                              ? "bg-green-500 hover:bg-green-600" 
                              : "bg-amber-500 hover:bg-amber-600"
                          )}
                          title={isThisCircleCredits ? "Cambiar a pago en euros" : "Cambiar a pago con puntos"}
                        >
                          {loadingSlot === absoluteIndex ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : isThisCircleCredits ? (
                            "€"
                          ) : (
                            <Gift className="w-3 h-3" />
                          )}
                        </button>
                      )}
                      
                        {isRecycled ? (
                          // ♻️ Mostrar símbolo de reciclaje para plazas recicladas
                          <div className="w-full h-full rounded-full bg-yellow-400 flex items-center justify-center shadow-[inset_0_4px_8px_rgba(0,0,0,0.3)]">
                            <span className="text-yellow-900 text-2xl">♻️</span>
                          </div>
                        ) : isOccupied ? (
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
                          // Círculo vacío: mostrar 🎁 si es plaza de puntos, + si es normal
                          isThisCircleCredits ? (
                            <Gift className="w-6 h-6 text-amber-600" />
                          ) : (
                            '+'
                          )
                        )}
                      </div>
                      <span className="text-xs font-medium leading-none">
                        {isRecycled ? (
                          <span className="text-yellow-600 font-semibold">♻️ Reciclada</span>
                        ) : isOccupied ? (
                          <span className="text-gray-700">{displayName}</span>
                        ) : isThisCircleCredits ? (
                          <span className="text-amber-600 font-bold">{creditsCost}p</span>
                        ) : (
                          <span className="text-green-400">Libre</span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
              
              {/* Price or Credits - Desglosado */}
              <div className="text-right flex-shrink-0 ml-auto mr-2">
                {hasAllCreditSlots ? (
                  // 🎁 Todas las plazas son con puntos
                  <div className="flex flex-col items-end gap-0.5">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-500 shadow-lg">
                      <span className="text-2xl">🎁</span>
                      <div className="flex flex-col items-end">
                        <span className="text-base font-bold text-amber-900 leading-none">{creditsCost}</span>
                        <span className="text-[10px] font-semibold text-amber-800 leading-none">Puntos</span>
                      </div>
                    </div>
                    <span className="text-[9px] text-amber-600 font-medium">Todas con puntos</span>
                  </div>
                ) : hasAnyCreditSlot ? (
                  // 💰+🎁 Algunas plazas con puntos, otras con euros
                  <div className="flex flex-col items-end gap-0.5">
                    <div className="text-lg font-bold text-gray-900">
                      € {pricePerPerson.toFixed(2)}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-amber-600 font-medium">Algunas con 🎁</span>
                    </div>
                  </div>
                ) : (
                  // 💰 Mostrar precio normal (ninguna plaza con puntos)
                  <div className="text-lg font-bold text-gray-900">
                    € {pricePerPerson.toFixed(2)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Available Courts - Indicadores de disponibilidad de pistas */}
      <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-100">
        <div className="text-center">
          {courtAssignment.isAssigned ? (
            <>
              <div className="text-xs text-gray-600 mb-1">Pista asignada:</div>
              <div className="flex items-center justify-center gap-1">
                <span className="font-semibold text-gray-900 text-sm">Pista {courtAssignment.courtNumber}</span>
                <svg 
                  className="ml-1" 
                  width="20" 
                  height="12" 
                  viewBox="0 0 60 40" 
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect x="2" y="2" width="56" height="36" rx="4" fill="#86BC24" stroke="#6B9B1E" strokeWidth="2"/>
                  <line x1="30" y1="2" x2="30" y2="38" stroke="#FFFFFF" strokeWidth="1.5" strokeDasharray="3 3"/>
                  <line x1="4" y1="20" x2="56" y2="20" stroke="#FFFFFF" strokeWidth="1" opacity="0.5"/>
                </svg>
              </div>
            </>
          ) : (
            <>
              <div className="text-[10px] text-gray-500 text-center mb-1">
                Disponibilidad de pistas
              </div>
              <div className="flex items-center justify-center gap-2">
                {(() => {
                  // Debug log
                  if (typeof window !== 'undefined') {
                    console.log('🏟️ ClassCard DEBUG:');
                    console.log('  - classData completo:', classData);
                    console.log('  - courtsAvailability:', (classData as any).courtsAvailability);
                    console.log('  - tipo:', typeof (classData as any).courtsAvailability);
                    console.log('  - es Array?:', Array.isArray((classData as any).courtsAvailability));
                    console.log('  - availableCourtsCount:', (classData as any).availableCourtsCount);
                  }
                  
                  const courts = (classData as any).courtsAvailability;
                  
                  if (!courts) {
                    console.warn('⚠️ courtsAvailability es null/undefined');
                    return false;
                  }
                  
                  if (!Array.isArray(courts)) {
                    console.warn('⚠️ courtsAvailability NO es un array:', courts);
                    return false;
                  }
                  
                  if (courts.length === 0) {
                    console.warn('⚠️ courtsAvailability es un array vacío');
                    return false;
                  }
                  
                  console.log('✅ courtsAvailability válido con', courts.length, 'pistas');
                  return true;
                })() ? (
                  (classData as any).courtsAvailability.map((court: any) => {
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
                          width="40" 
                          height="24" 
                          viewBox="0 0 60 40" 
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
                          <rect x="2" y="2" width="56" height="36" rx="4" fill={fillColor} stroke={strokeColor} strokeWidth="2" filter={`url(#innerShadow-${court.courtId})`}/>
                          <line x1="30" y1="2" x2="30" y2="38" stroke="#FFFFFF" strokeWidth="1.5" strokeDasharray="3 3"/>
                          <line x1="4" y1="20" x2="56" y2="20" stroke="#FFFFFF" strokeWidth="1" opacity="0.5"/>
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
                  // Fallback si no hay datos de disponibilidad
                  <span className="text-xs text-gray-500">Cargando disponibilidad...</span>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Diálogo de Confirmación */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Reserva</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas reservar una plaza para {pendingGroupSize} jugador{pendingGroupSize > 1 ? 'es' : ''}?
              <br /><br />
              <strong>Clase:</strong> {currentSlotData.level}
              <br />
              <strong>Fecha:</strong> {format(new Date(currentSlotData.start), "d 'de' MMMM 'a las' HH:mm", { locale: es })}
              <br />
              <strong>Precio por jugador:</strong> €{calculateSlotPrice(currentSlotData.totalPrice || 0, pendingGroupSize).toFixed(2)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleBook} className="bg-blue-600 hover:bg-blue-700">
              Confirmar Reserva
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo de Reserva Privada */}
      <AlertDialog open={showPrivateDialog} onOpenChange={setShowPrivateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reserva Privada</AlertDialogTitle>
            <AlertDialogDescription>
              Reserva la clase completa (instructor + pista) para tu grupo.
              <br /><br />
              <strong>Clase:</strong> {currentSlotData.level}
              <br />
              <strong>Fecha:</strong> {format(new Date(currentSlotData.start), "d 'de' MMMM 'a las' HH:mm", { locale: es })}
              <br />
              <strong>Precio total:</strong> €{(currentSlotData.totalPrice || 0).toFixed(2)}
              <br /><br />
              <div className="space-y-2">
                <label className="text-sm font-medium">¿Cuántas personas asistirán? (informativo)</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setPrivateAttendees(num)}
                      className={`flex-1 py-2 px-3 rounded-lg font-medium transition-colors ${
                        privateAttendees === num
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handlePrivateBooking} className="bg-purple-600 hover:bg-purple-700">
              Confirmar Reserva Privada
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// ✅ PERFORMANCE: Memoizar para evitar re-renders cuando otras tarjetas cambien
// NOTA: Comparamos bookings para detectar cambios tras reservar
export default React.memo(ClassCardReal, (prevProps, nextProps) => {
  // Re-renderizar si cambia CUALQUIERA de estos valores
  const classIdChanged = prevProps.classData.id !== nextProps.classData.id;
  const userChanged = prevProps.currentUser?.id !== nextProps.currentUser?.id;
  const bookedPlayersChanged = JSON.stringify(prevProps.classData.bookedPlayers) !== JSON.stringify(nextProps.classData.bookedPlayers);
  const bookingsChanged = JSON.stringify((prevProps.classData as any).bookings) !== JSON.stringify((nextProps.classData as any).bookings);
  const courtNumberChanged = prevProps.classData.courtNumber !== nextProps.classData.courtNumber;
  
  // Si algo cambió, NO bloquear el re-render (retornar false)
  const shouldBlock = !classIdChanged && !userChanged && !bookedPlayersChanged && !bookingsChanged && !courtNumberChanged;
  
  return shouldBlock;
});
