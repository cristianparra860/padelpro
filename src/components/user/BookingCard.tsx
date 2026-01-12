// src/components/user/BookingCard.tsx
"use client";

import React, { useMemo } from 'react';
import ClassCardReal from '@/components/class/ClassCardReal';
import type { User, TimeSlot } from '@/types';

interface BookingCardProps {
  booking: any;
  currentUser: User | null;
  onBookingSuccess: () => void;
  onCancelBooking: (bookingId: string) => Promise<void>;
  isPastClass?: boolean;
  isCancelled?: boolean;
  onHideFromHistory?: () => void;
}

// Wrapper component que memoriza la conversión de Booking → TimeSlot
const BookingCard = ({
  booking,
  currentUser,
  onBookingSuccess,
  onCancelBooking,
  isPastClass = false,
  isCancelled = false,
  onHideFromHistory
}: BookingCardProps) => {
  // Verificar si es clase o partida
  const isClassBooking = !!booking.timeSlot;
  const isMatchBooking = !!booking.matchGame;

  // Memoizar la conversión para que el objeto no cambie si booking.id no cambia
  const timeSlotData = useMemo<TimeSlot>(() => {
    if (!isClassBooking) {
      // Si no es una clase, retornar datos vacíos o manejar de otra forma
      return null as any;
    }

    // 🔍 DEBUG: Ver estructura de bookings que llega del API
    console.log('📦 BookingCard - Datos recibidos:', {
      timeSlotId: booking.timeSlot.id,
      bookingsCount: booking.timeSlot.bookings?.length || 0,
      firstBooking: booking.timeSlot.bookings?.[0],
      hasUserInFirstBooking: !!booking.timeSlot.bookings?.[0]?.user,
      userName: booking.timeSlot.bookings?.[0]?.user?.name,
      userProfilePic: booking.timeSlot.bookings?.[0]?.user?.profilePictureUrl,
      fullUserObject: booking.timeSlot.bookings?.[0]?.user
    });

    return {
      id: booking.timeSlot.id,
      start: booking.timeSlot.start,
      end: booking.timeSlot.end,
      level: booking.timeSlot.level || 'abierto',
      genderCategory: booking.timeSlot.genderCategory || null,
      instructorId: booking.timeSlot.instructorId || booking.timeSlot.instructor?.id || '',
      instructorName: booking.timeSlot.instructorName || booking.timeSlot.instructor?.name || 'Instructor',
      instructorProfilePicture: booking.timeSlot.instructorProfilePicture || booking.timeSlot.instructor?.profilePictureUrl,
      courtId: booking.timeSlot.courtId || null,
      courtNumber: booking.timeSlot.courtNumber || booking.timeSlot.court?.number || null,
      clubId: '',
      totalPrice: booking.timeSlot.totalPrice || 55,
      creditsSlots: booking.timeSlot.creditsSlots || [],
      bookings: (booking.timeSlot.bookings || []).map((b: any) => ({
        ...b,
        user: b.user ? {
          name: b.user.name,
          profilePictureUrl: b.user.profilePictureUrl,
          level: b.user.level,
          gender: b.user.gender
        } : null
      })),
      bookedPlayers: (booking.timeSlot.bookings || []).map((b: any) => ({
        ...b,
        user: b.user ? {
          name: b.user.name,
          profilePictureUrl: b.user.profilePictureUrl,
          level: b.user.level,
          gender: b.user.gender
        } : null
      })),
      courtsAvailability: booking.timeSlot.courtsAvailability || []
    };
  }, [
    isClassBooking,
    booking.id,
    booking.timeSlot?.id,
    booking.timeSlot?.courtNumber,
    booking.timeSlot?.bookings?.length
  ]); // NO incluir start/end para evitar cambios de referencia

  // Si no es una clase, no renderizar este componente (necesitaría otro componente para partidas)
  if (!isClassBooking) {
    return null;
  }

  const allowedPlayerCounts = useMemo(() => [1, 2, 3, 4], []);

  return (
    <ClassCardReal
      classData={timeSlotData}
      currentUser={currentUser}
      onBookingSuccess={onBookingSuccess}
      showPointsBonus={false}
      allowedPlayerCounts={allowedPlayerCounts}
      agendaMode={true}
      bookingId={booking.id}
      onCancelBooking={onCancelBooking}
      isPastClass={isPastClass}
      isCancelled={isCancelled}
      cancelledGroupSize={isCancelled ? booking.groupSize : undefined}
      cancelledUserData={isCancelled ? {
        name: booking.user?.name || currentUser?.name,
        profilePictureUrl: booking.user?.profilePictureUrl || currentUser?.profilePictureUrl
      } : undefined}
      onHideFromHistory={onHideFromHistory}
    />
  );
};

export default BookingCard;
