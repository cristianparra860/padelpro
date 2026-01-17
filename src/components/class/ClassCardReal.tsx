// src/components/class/ClassCardReal.tsx
"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { User, TimeSlot } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { cn, roundPrice } from '@/lib/utils';
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
  isInscriptionSelected?: boolean; // 🔵 Si la tarjeta está seleccionada como inscripción
  similarProposalsCount?: number; // 🔢 Número de propuestas similares (mismo horario/instructor)
  // Props para modo "Mi Agenda"
  agendaMode?: boolean; // Si es true, muestra botón cancelar en lugar de reservar
  bookingId?: string; // ID de la reserva para cancelar
  onCancelBooking?: (bookingId: string) => Promise<void>; // Callback para cancelar
  isPastClass?: boolean; // Si es true, la clase es pasada y no se puede cancelar
  isCancelled?: boolean; // Si es true, la clase está cancelada y se muestra badge rojo
  cancelledGroupSize?: number; // Tamaño del grupo que fue cancelado (para marcar plaza específica)
  cancelledUserData?: { name?: string; profilePictureUrl?: string }; // Datos del usuario que canceló
  userBookedGroupSize?: number; // 🆕 Tamaño del grupo que el usuario reservó (para resaltar en Mis Reservas)

  paidAmount?: number; // 💰 Monto pagado (para mostrar en Mis Reservas)
  refundedPoints?: number; // 💸 Puntos retornados
  onHideFromHistory?: () => void; // 🗑️ Callback para ocultar del historial (solo en clases pasadas)
  // Props para modo instructor
  instructorView?: boolean; // Si es true, muestra opciones de gestión para instructor
  unlockedAmount?: number; // 🔓 Saldo desbloqueado
}

interface Booking {
  userId: string;
  groupSize: number;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  isRecycled?: boolean; // ♻️ Si la plaza es reciclada (CANCELLED + isRecycled)
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
  creditsSlots: creditsSlotsProps = [], // 🎁 Recibir desde padre
  isInscriptionSelected = false, // 🔵 Nuevo prop para destacar inscripciones
  similarProposalsCount, // 🔢 Número de propuestas similares
  // Props para modo "Mi Agenda"
  agendaMode = false,
  bookingId,
  onCancelBooking,
  isPastClass = false,
  isCancelled = false,
  cancelledGroupSize,
  cancelledUserData,
  userBookedGroupSize, // 🆕 Tamaño del grupo reservado por el usuario

  paidAmount, // 💰 Monto pagado
  refundedPoints, // 💸 Puntos retornados
  onHideFromHistory, // 🗑️ Callback para ocultar del historial
  // Props para modo instructor
  instructorView = false,
  unlockedAmount, // 🔓 Saldo desbloqueado por caducidad
  blockedAmount, // 🔒 Saldo boqueado
}) => {
  const { toast } = useToast();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingGroupSize, setPendingGroupSize] = useState<number>(1);
  const [showPrivateDialog, setShowPrivateDialog] = useState(false);
  const [privateAttendees, setPrivateAttendees] = useState<number>(4);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelClassDialog, setShowCancelClassDialog] = useState(false);

  // 🆕 Estados para cesión parcial de plazas
  const [showPartialTransferDialog, setShowPartialTransferDialog] = useState(false);
  const [slotsToTransfer, setSlotsToTransfer] = useState<number>(1);
  const [isTransferring, setIsTransferring] = useState(false);

  // 🔍 DEBUG: Verificar props de instructor
  useEffect(() => {
    console.log('🎓 ClassCardReal - instructorView:', instructorView, 'classId:', classData.id, 'start:', classData.start);
  }, [instructorView, classData.id]);

  // 🔍 DEBUG: Verificar datos recibidos para nivel y categoría
  useEffect(() => {
    console.log('📊 ClassCardReal - Datos recibidos:', {
      id: classData.id,
      level: (classData as any).level,
      levelRange: (classData as any).levelRange,
      category: (classData as any).category,
      genderCategory: (classData as any).genderCategory,
      instructorName: (classData as any).instructorName
    });
  }, [classData.id]);

  const [isCancellingClass, setIsCancellingClass] = useState(false);

  // ✅ Validar que classData tiene los datos mínimos necesarios
  if (!classData || !classData.start || !classData.end) {
    console.error('❌ ClassCardReal: classData inválido:', classData);
    return null; // No renderizar si faltan datos críticos
  }

  // � Helper para limpiar prefijos del ID (class-, match-, etc.)
  const getCleanTimeSlotId = (id: string): string => {
    if (!id) return id;
    return id.replace(/^(class-|match-)/, '');
  };

  // �🔄 State local para el slot (permite actualización inmediata tras booking)
  // Usar classData directamente en lugar de state para evitar loops infinitos
  const currentSlotData = classData;

  // � Parsear creditsSlots desde classData o desde prop
  const parsedCreditsSlots = useMemo(() => {
    console.log('🎁 parsedCreditsSlots - Props recibidos:', JSON.stringify({
      'creditsSlotsProps (prop directo)': creditsSlotsProps,
      'classData.creditsSlots (de data)': classData.creditsSlots,
      'classData.creditsCost': classData.creditsCost,
      'type de creditsSlots': typeof classData.creditsSlots,
      'isArray creditsSlots': Array.isArray(classData.creditsSlots),
      'classData.id': classData.id?.substring(0, 20)
    }, null, 2));

    // Prioridad 1: creditsSlotsProps (si se pasa explícitamente desde padre)
    if (creditsSlotsProps && creditsSlotsProps.length > 0) {
      console.log('✅ Usando creditsSlotsProps:', creditsSlotsProps);
      return creditsSlotsProps;
    }

    // Prioridad 2: classData.creditsSlots (string JSON desde DB) - USAR classData, NO currentSlotData
    if (classData.creditsSlots) {
      // Si ya es un array, devolverlo directamente
      if (Array.isArray(classData.creditsSlots)) {
        console.log('✅ creditsSlots ya es array:', classData.creditsSlots);
        return classData.creditsSlots;
      }

      // Si es string, intentar parsearlo
      if (typeof classData.creditsSlots === 'string' && classData.creditsSlots.trim() !== '') {
        try {
          const parsed = JSON.parse(classData.creditsSlots);
          console.log('✅ creditsSlots parseado:', parsed);
          return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
          console.warn('⚠️ Error parseando creditsSlots:', e, 'Value:', classData.creditsSlots);
          return [];
        }
      }
    }

    console.log('⚠️ No hay creditsSlots válidos, retornando []');
    return [];
  }, [creditsSlotsProps, classData.creditsSlots]);

  // 🎓 Use parsedCreditsSlots directly instead of state to avoid infinite loops
  const creditsSlots = parsedCreditsSlots;
  const [loadingSlot, setLoadingSlot] = useState<number | null>(null);

  // ♻️ Combinar creditsSlots del padre con plazas recicladas
  // Las plazas recicladas deben comportarse como creditsSlots automáticamente
  const effectiveCreditsSlots = useMemo(() => {
    const combined = new Set(creditsSlots);

    // 🐛 DEBUG: Mostrar siempre qué está recibiendo
    console.log('🔧 effectiveCreditsSlots calculando:', JSON.stringify({
      creditsSlots: creditsSlots,
      creditsSlotsTYPE: typeof creditsSlots,
      creditsSlotslength: creditsSlots?.length,
      hasRecycledSlots: currentSlotData.hasRecycledSlots,
      availableRecycledSlots: currentSlotData.availableRecycledSlots,
      bookingsCount: currentSlotData.bookings?.length || 0,
      instructor: currentSlotData.instructorName,
      slotId: currentSlotData.id?.substring(0, 15)
    }, null, 2));

    // ♻️ Si hay plazas recicladas, agregar TODOS los círculos de esa modalidad
    if (currentSlotData.hasRecycledSlots && currentSlotData.availableRecycledSlots > 0) {
      const bookings = currentSlotData.bookings || [];

      // Buscar bookings reciclados para determinar la modalidad
      const recycledBookings = bookings.filter(b =>
        b.status === 'CANCELLED' && b.isRecycled === true
      );

      console.log('♻️ Bookings reciclados encontrados:', recycledBookings.length, recycledBookings);

      if (recycledBookings.length > 0) {
        // Tomar el primer booking reciclado para obtener el groupSize
        const groupSize = recycledBookings[0].groupSize;

        // Calcular el rango de índices para esa modalidad
        const startIndex = [1, 2, 3, 4].slice(0, groupSize - 1).reduce((sum, p) => sum + p, 0);
        const endIndex = startIndex + groupSize;

        // Agregar TODOS los círculos de esa modalidad como creditsSlots
        for (let i = startIndex; i < endIndex; i++) {
          combined.add(i);
        }

        console.log('♻️ Modalidad reciclada detectada:', {
          groupSize,
          startIndex,
          endIndex,
          indicesAgregados: Array.from(combined)
        });
      }
    }

    return Array.from(combined).sort((a, b) => a - b);
  }, [creditsSlots, currentSlotData.bookings, currentSlotData.hasRecycledSlots, currentSlotData.availableRecycledSlots, currentSlotData.instructorName]);

  // 🔍 Si no hay opciones de jugadores permitidas, no renderizar la tarjeta
  const availableOptions = useMemo(() => {
    return [1, 2, 3, 4].filter(count => allowedPlayerCounts.includes(count));
  }, [allowedPlayerCounts]);

  if (availableOptions.length === 0) {
    return null; // Ocultar completamente la tarjeta
  }

  const [loading, setLoading] = useState(false); // Ya no necesitamos loading inicial
  const [booking, setBooking] = useState(false);
  const [hasConfirmedBookingToday, setHasConfirmedBookingToday] = useState(false);
  const [userHasBookingInThisSlot, setUserHasBookingInThisSlot] = useState(false);
  const [loadingBookingCheck, setLoadingBookingCheck] = useState(!agendaMode); // No loading si es agenda mode

  // Extraer bookings directamente sin estado ni memoización problemática
  const bookingsData = (classData as any).bookings || classData.bookedPlayers || [];
  const bookings = Array.isArray(bookingsData) ? bookingsData : [];

  // � DEBUG: Verificar estructura de bookings
  console.log('🔍 ClassCardReal - bookings:', {
    classId: classData.id,
    bookingsCount: bookings.length,
    firstBooking: bookings[0] ? {
      id: bookings[0].id,
      hasUser: !!bookings[0].user,
      userName: bookings[0].user?.name,
      hasOldName: !!(bookings[0] as any).name,
      oldName: (bookings[0] as any).name
    } : null
  });

  // �🚫 Verificar si el usuario ya tiene una reserva confirmada este día
  // ⚠️ NO ejecutar esta validación en modo agenda (solo para mostrar reservas existentes)
  useEffect(() => {
    // Si estamos en modo agenda, salir inmediatamente sin hacer nada
    if (agendaMode) return;

    const checkConfirmedBookingToday = async () => {
      if (!currentUser?.id || !currentSlotData?.start) {
        setLoadingBookingCheck(false);
        return;
      }

      try {
        // Verificar si el usuario tiene booking EN ESTA tarjeta
        const userInThisSlot = bookings.some(b =>
          b.userId === currentUser.id && b.status !== 'CANCELLED'
        );
        setUserHasBookingInThisSlot(userInThisSlot);

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
          // Si tiene alguna reserva confirmada (courtId != null) ese día, bloquear OTRAS tarjetas
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
  }, [currentUser?.id, agendaMode, bookings]); // Añadido bookings para detectar cambios

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

    // 🚫 BLOQUEO: Verificar si ya tiene una reserva confirmada ese día (y NO es en esta tarjeta)
    if (hasConfirmedBookingToday && !userHasBookingInThisSlot) {
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

    if (hasConfirmedBookingToday && !userHasBookingInThisSlot) {
      toast({
        title: "❌ Reserva bloqueada",
        description: "Ya tienes una reserva confirmada para este día. Solo puedes tener una reserva confirmada por día.",
        variant: "destructive",
        duration: 5000
      });
      return;
    }

    setShowPrivateDialog(false);
    setBooking(true);

    try {
      const response = await fetch('/api/classes/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timeSlotId: getCleanTimeSlotId(currentSlotData.id),
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
      setBooking(false);
    }
  };

  const handleBook = async () => {
    const groupSize = pendingGroupSize;
    console.log('🎯 ========== INICIO handleBook ==========');
    console.log('🎯 handleBook confirmado con groupSize:', groupSize);
    console.log('🆔 User:', currentUser);
    console.log('🆔 User ID:', currentUser?.id);
    console.log('📋 TimeSlot ID:', currentSlotData.id);

    setShowConfirmDialog(false);
    console.log('🆔 User ID que se va a enviar:', currentUser?.id);
    console.log('📋 Tipo de currentUser.id:', typeof currentUser?.id);

    // 🎁 VERIFICAR SI ES UNA PLAZA CON PUNTOS (creditsSlot)
    // Calcular creditsCost basado en el precio por persona de la modalidad (redondeado)
    const totalPrice = currentSlotData.totalPrice || 25;
    let creditsCost = Math.ceil(roundPrice(totalPrice / groupSize)); // Precio en puntos = precio en euros redondeado (usar let para permitir reasignación)

    // Calcular índices para esta modalidad
    const startIndex = [1, 2, 3, 4].slice(0, groupSize - 1).reduce((sum, p) => sum + p, 0);
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

    console.log(`🎯 Modalidad ${groupSize}: índices ${startIndex}-${endIndex - 1}, próxima plaza disponible: ${nextAvailableIndex}`);

    // Verificar si la próxima plaza disponible es una creditsSlot
    const isCreditsSlot = nextAvailableIndex >= 0 &&
      Array.isArray(creditsSlots) &&
      creditsSlots.includes(nextAvailableIndex);

    console.log(`🎁 ¿Es creditsSlot? ${isCreditsSlot} (índice ${nextAvailableIndex} en array [${creditsSlots.join(', ')}])`);

    let usePoints = false;

    // 🎁 Verificar si esta plaza es reservable con puntos (incluye plazas recicladas)
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

    // ♻️ VERIFICAR SI HAY PLAZAS RECICLADAS EN ESTA CLASE (solo si no es credits slot)
    if (!isCreditsSlot) {
      // Verificar si HAY CUALQUIER plaza reciclada en la clase, sin importar groupSize
      const hasRecycledSlots = bookings.some(b =>
        b.status === 'CANCELLED' &&
        b.isRecycled === true
      );

      if (hasRecycledSlots) {
        // ♻️ Hay plazas recicladas - OBLIGATORIO usar puntos
        const userPoints = (currentUser as any).points || 0;
        const pricePerSlot = ((currentSlotData.totalPrice || 25) / groupSize);
        const pointsRequired = Math.floor(pricePerSlot);

        console.log(`♻️ Plaza reciclada detectada en clase. Puntos usuario: ${userPoints}, Requeridos: ${pointsRequired}`);

        if (userPoints >= pointsRequired) {
          // Usuario tiene suficientes puntos - usar automáticamente
          usePoints = true;
          console.log('✅ Usando puntos automáticamente para plaza reciclada');
          toast({
            title: "♻️ Plaza Reciclada",
            description: `Esta plaza se reservará con ${pointsRequired} puntos (tienes ${userPoints} disponibles).`,
            variant: "default",
            duration: 4000
          });
        } else {
          // No tiene suficientes puntos - NO PUEDE RESERVAR
          toast({
            title: "❌ Puntos Insuficientes",
            description: `Esta plaza reciclada requiere ${pointsRequired} puntos para reservar. Tienes ${userPoints} puntos. Acumula más puntos o elige otra clase.`,
            variant: "destructive",
            duration: 5000
          });
          return; // 🚫 No continuar con la reserva
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
          timeSlotId: getCleanTimeSlotId(currentSlotData.id),
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

          // ✅ Los bookings se actualizarán automáticamente cuando el padre reciba onBookingSuccess
          console.log('✅ Slot actualizado, bookings se sincronizarán desde padre');

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
      console.error('❌ Error de conexión en handleBook:', error);
      console.error('❌ Error completo:', JSON.stringify(error, null, 2));
      toast({
        title: "Error de conexión",
        description: "No se pudo conectar con el servidor. Verifica tu conexión.",
        variant: "destructive"
      });
    } finally {
      console.log('🔄 Finalizando handleBook, setBooking(false)');
      setBooking(false);
      console.log('🎯 ========== FIN handleBook ==========');
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
          timeSlotId: getCleanTimeSlotId(currentSlotData.id),
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

  // � Ceder plazas parciales (para reservas privadas)
  const handlePartialTransfer = async (slots: number) => {
    if (!currentUser?.id || !classData.id || slots < 1 || slots > 4) {
      toast({
        title: "Error",
        description: "Número de plazas inválido",
        variant: "destructive"
      });
      return;
    }

    setIsTransferring(true);
    setShowPartialTransferDialog(false);

    try {
      const response = await fetch(`/api/timeslots/${classData.id}/leave-partial`, {
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

        // Recargar datos
        setTimeout(() => {
          onBookingSuccess();
        }, 100);
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
      setIsTransferring(false);
    }
  };

  // �🎓 Anular clase por instructor
  const handleCancelClass = async () => {
    console.log('🔍 handleCancelClass - instructorView:', instructorView, 'classData.id:', classData.id);

    if (!instructorView || !classData.id) {
      console.error('❌ No se puede anular: instructorView =', instructorView, ', classData.id =', classData.id);
      toast({
        title: "Error",
        description: `No se puede anular la clase. instructorView: ${instructorView}, classId: ${classData.id}`,
        variant: "destructive"
      });
      return;
    }

    setIsCancellingClass(true);
    try {
      console.log('📤 Enviando petición POST a /api/instructor/cancel-class/' + classData.id);
      const response = await fetch(`/api/instructor/cancel-class/${classData.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await response.json();
      console.log('📥 Respuesta del servidor:', { ok: response.ok, status: response.status, result });

      if (response.ok) {
        toast({
          title: "✅ Clase anulada",
          description: result.message || "La clase ha sido cancelada y los alumnos reembolsados",
          className: "bg-green-600 text-white"
        });
        setShowCancelClassDialog(false);
        onBookingSuccess();
      } else {
        toast({
          title: "Error",
          description: result.error || "No se pudo anular la clase",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error de conexión",
        description: "No se pudo conectar con el servidor",
        variant: "destructive"
      });
    } finally {
      setIsCancellingClass(false);
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

  // 🆕 Función para calcular horas hasta inicio de la clase
  const getHoursUntilClass = () => {
    const now = new Date();
    const classStart = new Date(currentSlotData.start);
    const milliseconds = classStart.getTime() - now.getTime();
    return milliseconds / (1000 * 60 * 60); // Convertir a horas
  };

  // 🆕 Función para detectar si es una reserva privada (usuario tiene 4 bookings CONFIRMED en esta clase)
  const isPrivateBooking = () => {
    if (!currentUser?.id || !Array.isArray(bookings)) return false;
    const userBookings = bookings.filter(b =>
      b.userId === currentUser.id &&
      b.status === 'CONFIRMED'
    );
    return userBookings.length === 4;
  };

  // 🆕 Función para contar cuántos bookings confirmados tiene el usuario en esta clase
  const getUserConfirmedBookingsCount = () => {
    if (!currentUser?.id || !Array.isArray(bookings)) return 0;
    return bookings.filter(b =>
      b.userId === currentUser.id &&
      b.status === 'CONFIRMED'
    ).length;
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

  const pricePerPerson = roundPrice((currentSlotData.totalPrice || 25) / 4); // Precio en euros redondeado
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
    // Primero: Si ya tiene courtNumber o courtId en la BD, usarlo directamente
    if (currentSlotData.courtNumber != null && currentSlotData.courtNumber > 0) {
      return {
        isAssigned: true,
        courtNumber: currentSlotData.courtNumber
      };
    }

    // También verificar courtId (puede estar en la BD pero no courtNumber)
    if (currentSlotData.courtId != null) {
      // Si tiene courtId pero no courtNumber, intentar obtenerlo de los bookings o usar valor por defecto
      const courtNum = currentSlotData.courtNumber || 1;
      return {
        isAssigned: true,
        courtNumber: courtNum
      };
    }

    // Si estamos en modo agenda y no hay información de pista, no verificar bookings
    // porque estamos mostrando una reserva del pasado
    if (agendaMode) {
      return { isAssigned: false, courtNumber: null };
    }

    // Para modo normal: Verificar cada modalidad (1, 2, 3, 4 jugadores)
    if (!Array.isArray(bookings)) {
      return { isAssigned: false, courtNumber: null };
    }

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
    // PRIMERO: Verificar si el TimeSlot ya tiene una categoría asignada (de la BD o del API)
    // Buscar en classData.genderCategory (API) primero, luego category, luego currentSlotData
    const genderCategoryValue = (classData as any).genderCategory || (classData as any).category || currentSlotData.genderCategory;

    console.log('🔍 getDynamicCategory - classData.genderCategory:', (classData as any).genderCategory);
    console.log('🔍 getDynamicCategory - classData.category:', (classData as any).category);
    console.log('🔍 getDynamicCategory - currentSlotData.genderCategory:', currentSlotData.genderCategory);
    console.log('🔍 getDynamicCategory - genderCategoryValue final:', genderCategoryValue);
    console.log('🔍 getDynamicCategory - classData.id:', classData.id);

    if (genderCategoryValue && genderCategoryValue !== 'null') {
      // Si es "ABIERTO", mostrar "Abierta" como no asignado
      if (genderCategoryValue.toLowerCase() === 'abierto' || genderCategoryValue.toLowerCase() === 'abierta') {
        console.log('⚪ ABIERTO detectado - mostrar Abierta');
        // Continuar a calcular del primer usuario, pero si no hay, mostrar "Abierta"
      } else {
        const genderMapping: Record<string, string> = {
          'femenino': 'Chicas',
          'masculino': 'Chicos',
          'mujer': 'Chicas',
          'hombre': 'Chicos'
        };
        const category = genderMapping[genderCategoryValue.toLowerCase()] || 'Abierta';
        console.log('✅ Using category:', category);
        return { category, isAssigned: true };
      }
    }

    // SEGUNDO: Si no hay categoría en el TimeSlot O es "ABIERTO", calcular del primer usuario
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
        'chica': 'Chicas',
        'chico': 'Chicos',
        'femenino': 'Chicas',
        'masculino': 'Chicos',
        'mujer': 'Chicas',
        'hombre': 'Chicos'
      };

      const gender = firstUser.userGender.toLowerCase();
      const category = genderMapping[gender] || 'Abierta';

      return { category, isAssigned: true };
    }

    // Sin categoría asignada - retornar "Abierta" como placeholder
    console.log('⚪ Sin categoría asignada - mostrando "Abierta"');
    return { category: 'Abierta', isAssigned: false };
  };

  // Determinar nivel dinámico basado en el levelRange del TimeSlot o el primer usuario inscrito  
  const getDynamicLevel = (): { level: string; isAssigned: boolean } => {
    // 🐛 DEBUG: Log para ver qué datos recibe el componente
    console.log('🔍 getDynamicLevel - classData.id:', classData.id.substring(0, 12));
    console.log('🔍 getDynamicLevel - classData.level:', (classData as any)?.level);
    console.log('🔍 getDynamicLevel - classData.levelRange:', (classData as any)?.levelRange);
    console.log('🔍 getDynamicLevel - currentSlotData.level:', (currentSlotData as any)?.level);
    console.log('🔍 getDynamicLevel - currentSlotData.levelRange:', (currentSlotData as any)?.levelRange);

    // 🎯 PRIORIDAD 1: Usar levelRange del TimeSlot si está definido (usar classData que viene del API)
    const levelRange = (classData as any).levelRange || (currentSlotData as any).levelRange;
    if (levelRange && levelRange !== 'null') {
      // Si es "ABIERTO", mostrar "Abierto" como no asignado
      if (levelRange.toLowerCase() === 'abierto') {
        console.log('⚪ ABIERTO detectado - mostrando como nivel abierto');
        // Retornar "Abierto" como valor sin asignar para que se calcule dinámicamente
        // Pero si no hay bookings, se mostrará "Abierto"
      } else {
        console.log('✅ Using levelRange:', levelRange);
        return {
          level: levelRange,
          isAssigned: true
        };
      }
    }

    // 🎯 PRIORIDAD 2: Usar el campo "level" del TimeSlot directamente
    // Este campo ya contiene el rango correcto (ej: "5-7") gracias al backend
    const slotLevel = (classData as any)?.level || (currentSlotData as any)?.level;

    if (slotLevel && slotLevel !== 'null' && slotLevel.toLowerCase() !== 'abierto') {
      return { level: slotLevel, isAssigned: true };
    }

    // 🎯 PRIORIDAD 3: Si hay bookings confirmados/pendientes, calcular el nivel dinámicamente
    const bookingsWithLevel = currentSlotData.bookings?.filter((b: any) =>
      (b.status === 'CONFIRMED' || b.status === 'PENDING') && b.userLevel && b.userLevel !== 'abierto'
    ) || [];

    console.log('🔍 Bookings con nivel:', {
      total: currentSlotData.bookings?.length,
      withLevel: bookingsWithLevel.length,
      levels: bookingsWithLevel.map((b: any) => ({ name: b.userName, level: b.userLevel }))
    });

    if (bookingsWithLevel.length > 0) {
      // Extraer solo niveles numéricos (0.0 - 7.0)
      const userLevels = bookingsWithLevel
        .map((b: any) => {
          const numericLevel = parseFloat(b.userLevel);
          // Validar rango 0.0 a 7.0
          return (isNaN(numericLevel) || numericLevel < 0 || numericLevel > 7) ? null : numericLevel;
        })
        .filter((l: number | null): l is number => l !== null);

      if (userLevels.length > 0) {
        const minLevel = Math.min(...userLevels);
        const maxLevel = Math.max(...userLevels);

        // Formatear con un decimal (ej: 5.0, 5.5, 6.0)
        const formatLevel = (level: number) => level.toFixed(1);

        // Si solo hay un usuario o todos tienen el mismo nivel
        if (minLevel === maxLevel) {
          const singleLevelText = formatLevel(minLevel);
          console.log('📊 Nivel único:', singleLevelText);
          return { level: singleLevelText, isAssigned: true };
        }

        const calculatedRange = `${formatLevel(minLevel)} a ${formatLevel(maxLevel)}`;
        console.log('📊 Rango calculado:', calculatedRange);
        return { level: calculatedRange, isAssigned: true };
      }
    }

    // Sin datos asignados - retornar "Abierto" como placeholder
    console.log('⚪ Sin nivel asignado - mostrando "Abierto"');
    return { level: 'Abierto', isAssigned: false };
  };

  const categoryInfo = getDynamicCategory();
  const levelInfo = getDynamicLevel();

  console.log('🎨 VALORES FINALES:');
  console.log('  📊 categoryInfo.category:', categoryInfo.category);
  console.log('  📊 categoryInfo.isAssigned:', categoryInfo.isAssigned);
  console.log('  📊 levelInfo.level:', levelInfo.level);
  console.log('  📊 levelInfo.isAssigned:', levelInfo.isAssigned);
  console.log('  📊 Tipo de categoryInfo.category:', typeof categoryInfo.category);
  console.log('  📊 Tipo de levelInfo.level:', typeof levelInfo.level);

  const hasCourtNumber = Boolean(currentSlotData.courtNumber);
  const hasRecycledSlots = currentSlotData.hasRecycledSlots === true;
  const availableRecycledSlots = currentSlotData.availableRecycledSlots || 0;
  const recycledSlotsOnlyPoints = currentSlotData.recycledSlotsOnlyPoints === true;

  // Badge se muestra si la clase tiene pista Y tiene plazas recicladas disponibles
  const shouldShowBadge = hasCourtNumber && hasRecycledSlots && availableRecycledSlots > 0;

  // 🔍 DEBUG LOG - Para clases con datos de reciclaje
  if (hasRecycledSlots || availableRecycledSlots > 0) {
    console.log('♻️ CLASE CON DATOS DE RECICLAJE:', {
      id: currentSlotData.id?.substring(0, 20),
      instructor: currentSlotData.instructorName || 'N/A',
      courtNumber: currentSlotData.courtNumber,
      hasRecycledSlots,
      availableRecycledSlots,
      recycledSlotsOnlyPoints,
      shouldShowBadge,
      apiData: {
        hasRecycledSlots: currentSlotData.hasRecycledSlots,
        availableRecycledSlots: currentSlotData.availableRecycledSlots,
        recycledSlotsOnlyPoints: currentSlotData.recycledSlotsOnlyPoints
      }
    });
  }

  return (
    <div className={`bg-white rounded-2xl shadow-[0_8px_16px_rgba(0,0,0,0.3)] border overflow-hidden w-full scale-100 md:scale-[0.88] relative ${isInscriptionSelected
      ? 'border-4 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.5)]'
      : 'border-gray-100'
      }`}>
      {/* 🎓 Header CLASES */}
      {!isCancelled && (
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-3 py-2 flex items-center justify-center">
          <div className="text-white text-sm font-black uppercase">CLASES (60 MIN)</div>
        </div>
      )}

      {/* ❌ Badge de Clase Cancelada */}
      {isCancelled && (
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-3 py-2 flex items-center justify-center gap-2 shadow-lg">
          <div className="flex items-center gap-2">
            <div className="bg-white rounded-full w-6 h-6 flex items-center justify-center">
              <span className="text-red-600 font-black text-lg">✕</span>
            </div>
            <span className="text-white font-bold text-sm uppercase tracking-wide">
              Clase Cancelada
            </span>
          </div>
        </div>
      )}

      {/* Header with Instructor Info */}
      <div className="px-3 pt-2 pb-1">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* Instructor Avatar */}
            <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center flex-shrink-0">
              {(currentSlotData.instructorProfilePicture || currentSlotData.instructorPhoto) ? (
                <img
                  src={currentSlotData.instructorProfilePicture || currentSlotData.instructorPhoto}
                  alt={currentSlotData.instructorName || 'Instructor'}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const fallback = target.parentElement?.querySelector('.fallback-avatar') as HTMLElement;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
              ) : null}
              <div
                className="fallback-avatar w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-base"
                style={{ display: (currentSlotData.instructorProfilePicture || currentSlotData.instructorPhoto) ? 'none' : 'flex' }}
              >
                {(currentSlotData.instructorName || 'I').charAt(0).toUpperCase()}
              </div>
            </div>

            {/* Instructor Name and Rating */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 text-xs leading-tight line-clamp-2 break-words">
                {currentSlotData.instructorName || 'Carlos Santana'}
              </h3>
              <div className="flex items-center gap-1 mt-0.5">
                {/* Stars */}
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg key={star} className="w-1.5 h-1.5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                  ))}
                </div>
                <span className="text-[10px] text-gray-600 ml-1">(4.5)</span>
              </div>
            </div>
          </div>

          {/* Reserve/Cancel Button */}
          {agendaMode && !isCancelled && !isPastClass ? (
            // Botón condicional para modo "Mi Agenda"
            (() => {
              const hoursUntilClass = getHoursUntilClass();
              const isPrivate = isPrivateBooking();
              const userBookingsCount = getUserConfirmedBookingsCount();
              const userBooking = bookings?.find((b: any) => b.userId === currentUser?.id && b.status !== 'CANCELLED');
              const isPending = userBooking?.status === 'PENDING';

              // Si es pendiente, siempre se puede cancelar sin penalización. Si es confirmada, depende de las 24h.
              const canFullCancel = isPending || hoursUntilClass >= 24;

              // Si es reserva privada o tiene múltiples bookings Y faltan menos de 24h, mostrar cesión parcial
              if ((isPrivate || userBookingsCount > 1) && !canFullCancel) {
                return (
                  <AlertDialog open={showPartialTransferDialog} onOpenChange={setShowPartialTransferDialog}>
                    <AlertDialogTrigger asChild>
                      <button
                        className="bg-yellow-600 hover:bg-yellow-700 text-white px-2 py-1 rounded-lg font-medium text-[10px] transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed mt-1"
                        disabled={isTransferring}
                      >
                        {isTransferring ? 'Cediendo...' : '♻️ Ceder Plazas'}
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>♻️ Ceder Plazas de Reserva</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tienes {userBookingsCount} plaza{userBookingsCount > 1 ? 's' : ''} confirmada{userBookingsCount > 1 ? 's' : ''} en esta clase.
                          Selecciona cuántas plazas deseas ceder. Recibirás puntos de compensación por cada plaza cedida.
                          {hoursUntilClass < 24 && (
                            <span className="block mt-2 text-red-600 font-semibold">
                              ⚠️ Faltan menos de 24h para la clase. Solo puedes ceder plazas, no cancelar sin penalización.
                            </span>
                          )}
                        </AlertDialogDescription>
                      </AlertDialogHeader>

                      {/* Grid de opciones de plazas a ceder */}
                      <div className="grid grid-cols-2 gap-3 my-4">
                        {[1, 2, 3, 4].slice(0, userBookingsCount).map((count) => {
                          const pricePerSlot = calculateSlotPrice(currentSlotData.totalPrice || 0, count);
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
                        >
                          Ceder {slotsToTransfer} Plaza{slotsToTransfer > 1 ? 's' : ''}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                );
              }

              // Si faltan >= 24h O no es reserva múltiple, mostrar cancelación normal
              return (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded-lg font-medium text-[10px] transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed mt-1"
                      disabled={isCancelling}
                    >
                      {isCancelling ? 'Cancelando...' : 'Cancelar'}
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmar Cancelación</AlertDialogTitle>
                      <AlertDialogDescription>
                        {isPending ? (
                          <>
                            ¿Estás seguro que quieres cancelar tu inscripción?
                            <br /><br />
                            <span className="text-green-600 font-semibold">
                              Al ser una inscripción pendiente, no hay penalización.
                            </span>
                          </>
                        ) : canFullCancel ? (
                          <>
                            ¿Estás seguro que quieres cancelar tu inscripción?
                            Como faltan más de 24 horas, no se aplicará penalización.
                          </>
                        ) : (
                          <>
                            ¿Estás seguro que quieres cancelar tu inscripción?
                            <br /><br />
                            <span className="text-red-600 font-semibold">
                              ⚠️ Se te aplicará una penalización porque faltan menos de 24 horas.
                            </span>
                          </>
                        )}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Volver</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={async () => {
                          if (bookingId && onCancelBooking) {
                            setIsCancelling(true);
                            await onCancelBooking(bookingId);
                            setIsCancelling(false);
                          }
                        }}
                        className="bg-destructive hover:bg-destructive/90"
                      >
                        Sí, Cancelar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              );
            })()
          ) : agendaMode && (isCancelled || isPastClass) ? (
            // Clase ya cancelada O clase pasada - mostrar botón eliminar del historial
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded-lg font-medium text-[10px] transition-colors shadow-lg flex items-center gap-1 justify-center mt-1">
                  <X className="w-3.5 h-3.5" />
                  Eliminar
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar del historial?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta clase se ocultará de tu historial de "Pasadas". Esta acción no elimina la reserva de la base de datos.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>No, mantener</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async () => {
                      if (onHideFromHistory) {
                        await onHideFromHistory();
                      }
                    }}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Sí, Eliminar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : instructorView ? (
            // Botón de Anular Clase/Propuesta para instructores
            <AlertDialog open={showCancelClassDialog} onOpenChange={setShowCancelClassDialog}>
              <AlertDialogTrigger asChild>
                <button
                  className={cn(
                    "px-2 py-1 rounded-lg font-medium text-[10px] transition-colors shadow-lg flex items-center gap-1.5 mt-1",
                    isCancellingClass
                      ? "bg-gray-400 cursor-not-allowed opacity-50"
                      : "bg-red-600 hover:bg-red-700 text-white"
                  )}
                  disabled={isCancellingClass}
                >
                  {isCancellingClass ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                  <div className="flex flex-col items-start leading-tight">
                    <span>Anular</span>
                    <span>{courtAssignment.isAssigned ? 'Clase' : 'Propuesta'}</span>
                  </div>
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Anular {courtAssignment.isAssigned ? 'clase' : 'propuesta'}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {courtAssignment.isAssigned ? (
                      <>
                        Esta acción cancelará la clase y reembolsará automáticamente a todos los alumnos inscritos.
                        <br /><br />
                        <strong>Clase:</strong> {levelInfo.level}
                        <br />
                        <strong>Fecha:</strong> {format(new Date(currentSlotData.start), "d 'de' MMMM 'a las' HH:mm", { locale: es })}
                        <br />
                        <strong>Alumnos inscritos:</strong> {bookings?.filter(b => b.status === 'CONFIRMED').length || 0}
                      </>
                    ) : (
                      <>
                        Esta acción eliminará permanentemente esta propuesta de clase. Si hay alumnos inscritos, serán reembolsados automáticamente.
                        <br /><br />
                        <strong>Propuesta:</strong> {levelInfo.level}
                        <br />
                        <strong>Fecha:</strong> {format(new Date(currentSlotData.start), "d 'de' MMMM 'a las' HH:mm", { locale: es })}
                        <br />
                        <strong>Alumnos interesados:</strong> {bookings?.filter(b => b.status === 'CONFIRMED').length || 0}
                      </>
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCancelClass} className="bg-red-600 hover:bg-red-700">
                    Confirmar Anulación
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            // Botón de Reserva Privada para modo normal
            <button
              className={cn(
                "px-2 py-1 rounded-lg font-medium text-[10px] transition-colors shadow-lg flex items-center gap-1.5 mt-1",
                hasRecycledSlots || courtAssignment.isAssigned
                  ? "bg-gray-400 cursor-not-allowed opacity-50"
                  : "bg-purple-600 hover:bg-purple-700 text-white"
              )}
              onClick={() => {
                if (hasConfirmedBookingToday && !userHasBookingInThisSlot) {
                  toast({
                    title: "❌ Reserva bloqueada",
                    description: "Ya tienes una reserva confirmada este día",
                    variant: "destructive",
                    duration: 5000
                  });
                } else if (hasRecycledSlots) {
                  toast({
                    title: "♻️ Solo plazas recicladas disponibles",
                    description: "Esta clase tiene plazas recicladas. Solo puedes reservar usando los círculos amarillos con puntos.",
                    variant: "destructive",
                    duration: 5000
                  });
                } else if (courtAssignment.isAssigned) {
                  toast({
                    title: "❌ Clase confirmada",
                    description: "Esta clase ya está confirmada con pista asignada. No se pueden hacer más reservas privadas.",
                    variant: "destructive",
                    duration: 5000
                  });
                } else {
                  setShowPrivateDialog(true);
                }
              }}
              disabled={hasRecycledSlots || courtAssignment.isAssigned}
            >
              <span className="text-lg">+</span>
              <div className="flex flex-col items-start leading-tight">
                <span>Reserva</span>
                <span>privada</span>
              </div>
            </button>
          )}
        </div>

        {/* Class Info */}
        <div className="grid grid-cols-3 gap-1 text-center text-sm text-gray-600 border-b border-gray-100 pb-0.5">
          <div>
            <div className="font-medium text-gray-900 text-[10px]">Nivel</div>
            <div
              className={`capitalize px-2 py-1.5 rounded-full text-xs font-semibold shadow-[inset_0_4px_8px_rgba(0,0,0,0.3)] ${levelInfo.isAssigned
                ? 'bg-blue-100 text-blue-800'
                : 'bg-white text-gray-600'
                }`}
            >
              {levelInfo.level}
            </div>
          </div>
          <div>
            <div className="font-medium text-gray-900 text-[10px]">Cat.</div>
            <div
              className={`capitalize px-2 py-1.5 rounded-full text-xs font-semibold shadow-[inset_0_4px_8px_rgba(0,0,0,0.3)] ${categoryInfo.isAssigned
                ? 'bg-blue-100 text-blue-800'
                : 'bg-white text-gray-600'
                }`}
            >
              {categoryInfo.category}
            </div>
          </div>
          <div>
            <div className="font-medium text-gray-900 text-[10px]">Pista</div>
            <div
              className={`px-2 py-1.5 rounded-full text-xs font-semibold shadow-[inset_0_4px_8px_rgba(0,0,0,0.3)] ${courtAssignment.isAssigned
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
      <div className="px-2 py-0.5">
        <div className="bg-gray-50 rounded-xl p-1 border border-gray-200">
          <div className="flex items-center justify-between">
            {/* Fecha - Izquierda */}
            <div className="flex items-center gap-2">
              {/* Número del día */}
              <div className="text-[1.25rem] font-black text-gray-900 leading-none min-w-[2rem] text-center">
                {format(toDateObject(currentSlotData.start), 'dd', { locale: es })}
              </div>
              {/* Día y mes en texto */}
              <div className="flex flex-col justify-center gap-0.5">
                <div className="text-xs font-bold text-gray-900 uppercase tracking-tight leading-none">
                  {format(toDateObject(currentSlotData.start), 'EEEE', { locale: es })}
                </div>
                <div className="text-xs font-normal text-gray-500 capitalize leading-none">
                  {format(toDateObject(currentSlotData.start), 'MMMM', { locale: es })}
                </div>
              </div>
            </div>

            {/* Hora y duración - Derecha */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xl font-bold text-gray-900 leading-none">
                  {formatTime(currentSlotData.start)}
                </div>
                <div className="text-[10px] text-gray-500 flex items-center justify-end gap-0.5 mt-0.5">
                  <Clock className="w-2 h-2" />
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
      <div className="px-3 py-1.5 space-y-1">
        {/* 🚫 Mensaje de bloqueo REMOVED as per user request */}

        {[1, 2, 3, 4].filter(players => allowedPlayerCounts.includes(players)).map((players) => {
          // ♻️ BLOQUEO DE MODALIDADES: Si hay plazas recicladas en el slot, solo habilitar modalidades con reciclaje
          const hasRecycledInSlot = currentSlotData.hasRecycledSlots && currentSlotData.availableRecycledSlots > 0;

          // ♻️ CRÍTICO: Determinar si ESTA modalidad específica tiene reciclaje
          // Primero necesitamos filtrar los bookings de esta modalidad
          const allBookingsForThisModality = (currentSlotData.bookings || []).filter(b => b.groupSize === players);
          const thisModalityHasRecycling = allBookingsForThisModality.some(b =>
            b.status === 'CANCELLED' && b.isRecycled === true
          );

          // ♻️ Si hay reciclaje en el slot y esta modalidad NO tiene reciclaje, deshabilitar
          const isDisabledByRecycling = hasRecycledInSlot && !thisModalityHasRecycling;

          // ♻️ SOLO incluir bookings activos (NO reciclados) - los reciclados se muestran como círculos vacíos amarillos
          const modalityBookings = Array.isArray(bookings)
            ? bookings.filter(b => {
              // Incluir SOLO activos (PENDING/CONFIRMED), excluir TODOS los CANCELLED
              return b.groupSize === players && b.status !== 'CANCELLED';
            })
            : [];

          // Para el conteo de confirmados, solo usar los NO cancelados
          const activeModalityBookings = modalityBookings.filter(b => b.status !== 'CANCELLED');

          // ♻️ Calcular plazas recicladas en esta modalidad específica usando currentSlotData.bookings (que incluye CANCELLED)
          const recycledInThisModality = allBookingsForThisModality.filter(b =>
            b.status === 'CANCELLED' && b.isRecycled === true
          );
          const hasExactRecycledCount = recycledInThisModality.length === players;

          // Verificar si esta modalidad está confirmada (tiene pista asignada)
          const isThisModalityConfirmed = courtAssignment.isAssigned &&
            activeModalityBookings.length >= players &&
            activeModalityBookings.some(b => b.status === 'CONFIRMED');

          // Verificar si OTRA modalidad está confirmada
          // ♻️ CRÍTICO: Si ESTA modalidad tiene reciclaje (thisModalityHasRecycling), NO bloquearla
          const isAnotherModalityConfirmed = courtAssignment.isAssigned &&
            !isThisModalityConfirmed &&
            !thisModalityHasRecycling; // ♻️ Usar thisModalityHasRecycling que se calculó correctamente

          // ♻️ Contar cuántas plazas recicladas hay en ESTA modalidad específica
          const recycledCountInModality = modalityBookings.filter(b =>
            b.status === 'CANCELLED' && b.isRecycled === true
          ).length;
          const hasExactRecycledMatch = recycledCountInModality === players;

          // 🎁 Verificar si esta modalidad es reservable con puntos
          // Calcular creditsCost dinámicamente: precio por persona redondeado
          const totalPrice = currentSlotData.totalPrice || 25;
          const creditsCost = Math.ceil(roundPrice(totalPrice / players));

          // Calcular cuántas plazas de esta modalidad son de puntos (incluye recicladas)
          const startIndex = [1, 2, 3, 4].slice(0, players - 1).reduce((sum, p) => sum + p, 0);
          const endIndex = startIndex + players;
          const creditsSlotIndicesForThisModality = Array.isArray(effectiveCreditsSlots)
            ? effectiveCreditsSlots.filter(idx => idx >= startIndex && idx < endIndex)
            : [];

          const hasAnyCreditSlot = creditsSlotIndicesForThisModality.length > 0 || thisModalityHasRecycling;
          const hasAllCreditSlots = creditsSlotIndicesForThisModality.length === players || thisModalityHasRecycling;

          // 🔍 DEBUG: Mostrar datos antes de calcular isCreditsSlot
          console.log(`🔍 Pre-isCreditsSlot check (${players}p):`, JSON.stringify({
            players,
            effectiveCreditsSlots,
            includesPlayers: effectiveCreditsSlots?.includes(players),
            hasAllCreditSlots,
            thisModalityHasRecycling
          }, null, 2));

          // ♻️ Si hay plazas recicladas, toda la modalidad debe ser de puntos
          const isCreditsSlot = thisModalityHasRecycling || (Array.isArray(effectiveCreditsSlots) &&
            (effectiveCreditsSlots.includes(players) || hasAllCreditSlots));

          // 🐛 DEBUG temporal para Cristian Parra slot
          if (currentSlotData.id.includes('z9y4veby1rd')) {
            console.log(`🐛 DEBUG slot ${currentSlotData.id.substring(0, 12)}:`, {
              players,
              creditsSlotsOriginal: creditsSlots,
              effectiveCreditsSlots: effectiveCreditsSlots,
              isArray: Array.isArray(effectiveCreditsSlots),
              includes: effectiveCreditsSlots.includes ? effectiveCreditsSlots.includes(players) : 'NO includes method',
              isCreditsSlot,
              creditsCost
            });
          }

          // Debug log para mostrar el filtrado
          if (bookings.length > 0) {
            console.log(`🎯 Clase ${currentSlotData.id.substring(0, 8)}: Modalidad ${players} jugadores`);
            console.log(`📋 Todas las reservas:`, bookings.map(b => `${b.name}(${b.groupSize})`));
            console.log(`📋 Reservas activas + recicladas para ${players}:`, modalityBookings.map(b => `${b.name}(${b.groupSize}, ${b.status}${b.isRecycled ? ' ♻️' : ''})`));
            console.log(`📋 Reservas SOLO activas:`, activeModalityBookings.map(b => `${b.name}(${b.groupSize})`));
            console.log(`♻️ Tiene plazas recicladas:`, thisModalityHasRecycling);
            console.log(`🎁 Es plaza con puntos:`, isCreditsSlot, '- Coste:', creditsCost);
          }

          // Para esta modalidad específica, determinar qué bookings mostrar
          // 🔴 EN PANEL DE CANCELADAS: Mostrar bookings cancelados para indicar qué plaza fue cancelada
          // ♻️ EN PANEL NORMAL: Mostrar solo activos (los reciclados se ven como círculos amarillos vacíos)
          const bookedUsers = isCancelled
            ? allBookingsForThisModality.slice(0, players) // Panel canceladas: mostrar TODOS (incluye CANCELLED)
            : modalityBookings.slice(0, players); // Panel normal: solo activos (excluye CANCELLED)

          // 🐛 DEBUG: Verificar datos de bookings reciclados
          if (thisModalityHasRecycling) {
            console.log(`♻️♻️♻️ MODALIDAD ${players}:`, {
              recycledCount: recycledInThisModality.length,
              playersNeeded: players,
              hasExactMatch: hasExactRecycledCount,
              bookedUsersShown: bookedUsers.length,
              shouldBeReservable: hasExactRecycledCount
            });
          }

          const isUserBookedForOption = isUserBooked(players);
          const pricePerPerson = roundPrice((currentSlotData.totalPrice || 25) / players); // Precio en euros redondeado

          // 🆕 Verificar si esta es la opción específica que el usuario reservó
          const isUserBookedOption = agendaMode && userBookedGroupSize === players;

          return (
            <div
              key={players}
              className={cn(
                "flex items-center justify-between gap-2 p-1 rounded-lg transition-colors min-w-0 relative",
                // 🆕 Resaltar la opción que el usuario reservó en modo agenda
                isUserBookedOption
                  ? "bg-blue-100 border-2 border-blue-500 shadow-md"
                  : // No aplicar opacity si es una clase cancelada (solo mostrar información)
                  isCancelled
                    ? "bg-gray-50"
                    : isDisabledByRecycling
                      ? "opacity-30 cursor-not-allowed bg-gray-100" // ♻️ Deshabilitar modalidades no recicladas
                      : (hasConfirmedBookingToday && !userHasBookingInThisSlot) || isAnotherModalityConfirmed
                        ? "opacity-40 cursor-not-allowed bg-gray-100"
                        : "cursor-pointer hover:bg-gray-50"
              )}
              onClick={() => {
                if (isCancelled) {
                  // No permitir clicks en clases canceladas
                  return;
                }
                if (isDisabledByRecycling) {
                  // ♻️ Bloquear reserva en modalidades no recicladas
                  toast({
                    title: "♻️ Solo modalidades recicladas disponibles",
                    description: "Esta clase tiene plazas recicladas. Solo puedes reservar en las modalidades con círculos amarillos usando puntos.",
                    variant: "destructive",
                    duration: 4000
                  });
                  return;
                }
                if (hasConfirmedBookingToday && !userHasBookingInThisSlot) {
                  toast({
                    title: "❌ Reserva bloqueada",
                    description: "Ya tienes una reserva confirmada este día. Solo puedes tener una reserva confirmada por día.",
                    variant: "destructive",
                    duration: 5000
                  });
                } else if (!isAnotherModalityConfirmed) {
                  console.log(`🎯 Click en modalidad ${players} - isAnotherModalityConfirmed: ${isAnotherModalityConfirmed}, hasExactRecycledCount: ${hasExactRecycledCount}`);
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
              {/* Capa transparente para bloquear clics en clase confirmada */}
              {/* ♻️ SOLO bloquear si NO hay plazas recicladas en esta modalidad */}
              {courtAssignment.isAssigned && !thisModalityHasRecycling && (
                <div
                  className="absolute inset-0 z-10 cursor-not-allowed"
                  onClick={(e) => {
                    e.stopPropagation();
                    toast({
                      title: "❌ Clase confirmada",
                      description: "Esta clase ya está confirmada con pista asignada. No se pueden hacer más reservas.",
                      variant: "destructive",
                      duration: 4000
                    });
                  }}
                  title="Clase confirmada - No se permiten más reservas"
                />
              )}
              {/* Player Circles */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {Array.from({ length: players }).map((_, index) => {
                  const booking = bookedUsers[index];
                  const isOccupied = !!booking;
                  const isCurrentUser = booking?.userId === currentUser?.id;
                  const isRecycled = booking?.status === 'CANCELLED' && booking?.isRecycled === true;
                  const displayName = booking?.user?.name ? booking.user.name.substring(0, 5) : '';

                  // 🎁 CAMBIO CRÍTICO: creditsSlots guarda groupSize (1-4), no absoluteIndex
                  // Si la modalidad de 2 jugadores está marcada, creditsSlots = [2]
                  const groupSize = players;

                  // Verificar si TODA la modalidad (groupSize) está marcada como creditsSlot
                  const isMarkedAsCreditsSlot = Array.isArray(effectiveCreditsSlots) && effectiveCreditsSlots.includes(groupSize);

                  // Si la modalidad está marcada como credits, TODOS los círculos de esa modalidad se muestran en verde
                  const isThisCircleCredits = isMarkedAsCreditsSlot;

                  // 🐛 DEBUG para ver la lógica - LOG SIEMPRE para debug
                  if (index === 0) {
                    console.log(`🎯 Plaza ${players}p:`, {
                      groupSize,
                      players,
                      isMarkedAsCreditsSlot,
                      isThisCircleCredits,
                      isOccupied,
                      effectiveCreditsSlots: Array.from(effectiveCreditsSlots),
                      creditsSlotsState: creditsSlots
                    });
                  }

                  // �🔴 Detectar si este círculo es la plaza cancelada (para panel de canceladas)
                  // Si estamos en modo isCancelled, TODOS los círculos ocupados deben ser rojos
                  const isCancelledSlot = isCancelled &&
                    isOccupied &&
                    booking.status === 'CANCELLED';

                  // ♻️ Detectar si es plaza reciclada (CANCELLED + isRecycled)
                  // Solo mostrar amarilla si NO estamos en panel de canceladas
                  const isRecycledBooking = !isCancelled &&
                    isOccupied &&
                    booking.status === 'CANCELLED' &&
                    booking.isRecycled === true;

                  // 🐛 DEBUG: Log para verificar detección
                  if (isOccupied && (booking.status === 'CANCELLED' || booking.isRecycled)) {
                    console.log('🔍 SLOT DETECTADO:', {
                      index,
                      players,
                      status: booking.status,
                      isRecycled: booking.isRecycled,
                      isCancelled,
                      cancelledGroupSize,
                      isCancelledSlot,
                      isRecycledBooking,
                      name: booking.name
                    });
                  }

                  // Debug log para ver los datos del booking
                  if (isOccupied && index === 0) {
                    console.log('🖼️ Booking completo:', booking);
                    console.log('📸 profilePictureUrl:', booking.profilePictureUrl);
                    console.log('♻️ isRecycled:', isRecycled);
                  }

                  return (
                    <div key={index} className="flex flex-col items-center gap-0.5 relative w-10">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all border-2",
                          isCancelledSlot
                            ? 'bg-white border-red-600 ring-4 ring-red-300' // 🔴 Plaza cancelada en panel canceladas
                            : isRecycledBooking
                              ? 'bg-white border-yellow-500 recycled-slot-blink' // ♻️ Plaza reciclada en panel principal
                              : isOccupied
                                ? (isThisCircleCredits ? 'bg-white border-amber-500 shadow-[inset_0_4px_8px_rgba(0,0,0,0.3)]' : 'bg-white border-gray-200 shadow-[inset_0_4px_8px_rgba(0,0,0,0.3)]')
                                : (isThisCircleCredits
                                  ? 'bg-amber-50 border-yellow-400 border-4 text-amber-600 shadow-[0_0_20px_rgba(234,179,8,0.8)]' // 🎁 Plaza vacía con puntos
                                  : 'bg-gray-100 border-gray-300 text-gray-400 text-xl shadow-[inset_0_4px_8px_rgba(0,0,0,0.3)] cursor-pointer hover:bg-gray-200 hover:border-gray-400'),
                          isCurrentUser && 'ring-2 ring-blue-400 ring-offset-1',
                          isAnotherModalityConfirmed && 'grayscale opacity-50',
                          isThisCircleCredits && !isOccupied && !isCancelledSlot && 'shadow-[0_0_15px_rgba(245,158,11,0.5)] animate-pulse' // 🎁 Glow dorado pulsante
                        )}
                        title={
                          isCancelledSlot
                            ? '🔴 Plaza cancelada'
                            : isRecycledBooking
                              ? '♻️ Plaza reciclada - Reservable con puntos'
                              : isThisCircleCredits
                                ? `🎁 Reservable con ${creditsCost} puntos`
                                : isAnotherModalityConfirmed
                                  ? 'Opción bloqueada - Otra modalidad confirmada'
                                  : isOccupied ? booking.user?.name : 'Disponible'
                        }
                      >
                        {isCancelledSlot ? (
                          // 🔴 Plaza cancelada: foto con overlay rojo + X blanca (PRIORIDAD sobre reciclada)
                          <div className="relative w-full h-full rounded-full overflow-hidden">
                            {/* Foto de fondo del usuario */}
                            {booking.user?.profilePictureUrl ? (
                              <img
                                src={booking.user.profilePictureUrl}
                                alt={booking.user?.name || 'Usuario'}
                                className="absolute inset-0 w-full h-full object-cover"
                              />
                            ) : (
                              <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center">
                                <span className="text-white text-lg font-bold">
                                  {booking.user?.name ? booking.user.name.charAt(0).toUpperCase() : '?'}
                                </span>
                              </div>
                            )}
                            {/* Overlay rojo translúcido 30% */}
                            <div className="absolute inset-0 bg-red-600 bg-opacity-30"></div>
                            {/* X blanca fina */}
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-white text-3xl font-light drop-shadow-lg">✕</span>
                            </div>
                          </div>
                        ) : isRecycledBooking ? (
                          // ♻️ Mostrar símbolo de reciclaje para bookings cancelados reciclados (en panel principal)
                          <div className="w-full h-full rounded-full bg-yellow-400 flex items-center justify-center shadow-[inset_0_4px_8px_rgba(0,0,0,0.3)]">
                            <span className="text-yellow-900 text-2xl">♻️</span>
                          </div>
                        ) : isOccupied ? (
                          (() => {
                            console.log(`🎨 Renderizando círculo ${index + 1}/${players}:`, {
                              hasProfilePic: !!booking.profilePictureUrl,
                              profilePicUrl: booking.profilePictureUrl,
                              'booking.user': booking.user,
                              'booking.user?.name': booking.user?.name,
                              'booking.userId': booking.userId,
                              'FULL_BOOKING': JSON.parse(JSON.stringify(booking))
                            });

                            if (booking.user?.profilePictureUrl) {
                              return (
                                <img
                                  src={booking.user.profilePictureUrl}
                                  alt={booking.user?.name || 'Usuario'}
                                  className="w-full h-full object-cover rounded-full shadow-[inset_0_4px_8px_rgba(0,0,0,0.3)]"
                                  onLoad={() => console.log('✅ Imagen cargada:', booking.user.profilePictureUrl)}
                                  onError={(e) => {
                                    console.error('❌ Error cargando imagen:', booking.user.profilePictureUrl);
                                    // Fallback a iniciales si la imagen falla
                                    const target = e.currentTarget;
                                    const parent = target.parentElement;
                                    if (parent) {
                                      parent.innerHTML = `<div class="w-full h-full rounded-full bg-green-400 flex items-center justify-center shadow-[inset_0_4px_8px_rgba(0,0,0,0.3)]"><span class="text-white text-sm font-bold">${getInitials(booking.user?.name || booking.userId)}</span></div>`;
                                    }
                                  }}
                                />
                              );
                            } else {
                              return (
                                <div className="w-full h-full rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-[inset_0_4px_8px_rgba(0,0,0,0.3)]">
                                  <span className="text-white text-xs font-bold">
                                    {getInitials(booking.user?.name || booking.userId)}
                                  </span>
                                </div>
                              );
                            }
                          })()
                        ) : (
                          // Círculo vacío: mostrar 🔴 X si es cancelado, 🎁 si es plaza de puntos, + si es normal
                          isCancelledSlot ? (
                            <div className="relative w-full h-full rounded-full overflow-hidden">
                              {/* Foto de fondo del usuario cancelado */}
                              {cancelledUserData?.profilePictureUrl ? (
                                <img
                                  src={cancelledUserData.profilePictureUrl}
                                  alt={cancelledUserData.name || 'Usuario cancelado'}
                                  className="absolute inset-0 w-full h-full object-cover"
                                />
                              ) : (
                                <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center">
                                  <span className="text-white text-xs font-bold">
                                    {cancelledUserData?.name ? cancelledUserData.name.charAt(0).toUpperCase() : '?'}
                                  </span>
                                </div>
                              )}
                              {/* Overlay rojo translúcido más suave */}
                              <div className="absolute inset-0 bg-red-600 bg-opacity-30"></div>
                              {/* X blanca más fina */}
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-white text-base font-light drop-shadow-lg">✕</span>
                              </div>
                            </div>
                          ) : isThisCircleCredits ? (
                            <Gift className="w-5 h-5 text-amber-600" />
                          ) : (
                            '+'
                          )
                        )}
                      </div>
                      <span className="text-[10px] font-medium leading-none">
                        {isCancelledSlot ? (
                          <span className="text-red-600 font-bold">Cancelada</span>
                        ) : isRecycledBooking ? (
                          <span className="text-yellow-600 font-semibold">♻️ Reciclada</span>
                        ) : isOccupied ? (
                          <span className="text-gray-700">{displayName}</span>
                        ) : isThisCircleCredits ? (
                          <span className="text-amber-600 font-bold">{creditsCost}p</span>
                        ) : (
                          <span className="text-gray-400">Libre</span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Price or Credits - Desglosado */}
              <div className="text-right flex-shrink-0 ml-auto mr-2 relative">
                {/* Contenedor del precio */}
                <div>
                  {hasAllCreditSlots && !isCancelled ? (
                    // 🎁 Todas las plazas son con puntos (NO mostrar en canceladas)
                    <div className="flex flex-col items-end gap-0.5">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-amber-400 bg-white shadow-md">
                        <div className="flex flex-col items-end">
                          <span className="text-base font-bold text-amber-900 leading-none">{creditsCost}</span>
                          <span className="text-[10px] font-semibold text-amber-800 leading-none">Puntos</span>
                        </div>
                      </div>
                      <span className="text-[9px] text-amber-600 font-medium">Todas con puntos</span>
                    </div>
                  ) : hasAnyCreditSlot && !isCancelled ? (
                    // 💰+🎁 Algunas plazas con puntos, otras con euros (NO mostrar badge en canceladas)
                    <div className="flex flex-col items-end gap-0.5">
                      <div className="text-base font-bold text-gray-900">
                        € {pricePerPerson.toFixed(2)}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] text-amber-600 font-medium">Algunas con 🎁</span>
                      </div>
                    </div>
                  ) : (
                    // 💰 Mostrar precio normal en euros (siempre visible, incluso en canceladas)
                    <div className="text-base font-bold text-gray-900">
                      € {pricePerPerson.toFixed(2)}
                    </div>
                  )}
                </div>
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
                        <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur" />
                        <feOffset in="blur" dx="0" dy="1" result="offsetBlur" />
                        <feFlood floodColor="#000000" floodOpacity="0.25" result="offsetColor" />
                        <feComposite in="offsetColor" in2="offsetBlur" operator="in" result="offsetBlur" />
                        <feComposite in="SourceGraphic" in2="offsetBlur" operator="over" />
                      </filter>
                    </defs>
                    <rect x="2" y="2" width="36" height="56" rx="4" fill="#10B981" stroke="#059669" strokeWidth="2" filter="url(#innerShadow-assigned)" />
                    <line x1="20" y1="2" x2="20" y2="58" stroke="#FFFFFF" strokeWidth="1.5" strokeDasharray="3 3" />
                    <line x1="2" y1="30" x2="38" y2="30" stroke="#FFFFFF" strokeWidth="1" opacity="0.5" />
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
                {(() => {
                  const courts = (classData as any).courtsAvailability;

                  // Validación rápida sin logs para evitar bucle infinito
                  if (!courts || !Array.isArray(courts) || courts.length === 0) {
                    return false;
                  }

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
                          width="19"
                          height="32"
                          viewBox="0 0 40 60"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <defs>
                            <filter id={`innerShadow-${court.courtId}`} x="-50%" y="-50%" width="200%" height="200%">
                              <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur" />
                              <feOffset in="blur" dx="0" dy="1" result="offsetBlur" />
                              <feFlood floodColor="#000000" floodOpacity="0.25" result="offsetColor" />
                              <feComposite in="offsetColor" in2="offsetBlur" operator="in" result="offsetBlur" />
                              <feComposite in="SourceGraphic" in2="offsetBlur" operator="over" />
                            </filter>
                          </defs>
                          <rect x="2" y="2" width="36" height="56" rx="4" fill={fillColor} stroke={strokeColor} strokeWidth="2" filter={`url(#innerShadow-${court.courtId})`} />
                          <line x1="20" y1="2" x2="20" y2="58" stroke="#FFFFFF" strokeWidth="1.5" strokeDasharray="3 3" />
                          <line x1="2" y1="30" x2="38" y2="30" stroke="#FFFFFF" strokeWidth="1" opacity="0.5" />
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

      {/* 💰 Footer con Información de Pago (Solo en Agenda Mode y Confirmada) */}
      {/* 🦶 Footer Unificado (Square Buttons) */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-2">
          {/* Botón Cancelar (Rojo Cuadrado) */}
          {agendaMode && !isPastClass && !isCancelled && bookingId && onCancelBooking && (
            <button
              onClick={() => onCancelBooking && bookingId && onCancelBooking(bookingId)}
              className="h-9 w-9 flex items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
              title="Cancelar"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}

          {/* Botón Borrar (Gris Cuadrado) */}
          {onHideFromHistory && (
            <button
              onClick={onHideFromHistory}
              className="h-9 w-9 flex items-center justify-center rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
              title="Borrar del historial"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>

        {/* Info Pago (Verde) / Reembolso (Naranja) / Desbloqueado (Azul) */}
        <div className="flex items-center gap-2">
          {paidAmount !== undefined && (
            <div className="h-9 px-3 flex items-center justify-center bg-green-50 rounded-lg border border-green-100 text-green-700" title="Pagado">
              <span className="text-xs font-medium mr-1">Pagado:</span>
              <span className="text-sm font-bold">{paidAmount.toFixed(2)}€</span>
            </div>
          )}
          {refundedPoints !== undefined && refundedPoints > 0 && isCancelled && (
            <div className="h-9 px-3 flex items-center justify-center bg-orange-50 rounded-lg border border-orange-100 text-orange-700" title="Puntos Retornados">
              <span className="text-sm font-bold">{refundedPoints.toFixed(2)} pts</span>
            </div>
          )}
          {unlockedAmount !== undefined && unlockedAmount > 0 && (
            <div className="h-9 px-3 flex items-center justify-center bg-blue-50 rounded-lg border border-blue-100 text-blue-700" title="Saldo Desbloqueado">
              <span className="text-xs font-medium mr-1">Desbloqueado:</span>
              <span className="text-sm font-bold">{unlockedAmount.toFixed(2)}€</span>
            </div>
          )}
          {blockedAmount !== undefined && blockedAmount > 0 && (
            <div className="h-9 px-3 flex items-center justify-center bg-purple-50 rounded-lg border border-purple-100 text-purple-700" title="Saldo Bloqueado">
              <span className="text-xs font-medium mr-1">Bloqueado:</span>
              <span className="text-sm font-bold">{blockedAmount.toFixed(2)}€</span>
            </div>
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
                      className={`flex-1 py-2 px-3 rounded-lg font-medium transition-colors ${privateAttendees === num
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

// Force recompile 12/10/2025 23:27:25
